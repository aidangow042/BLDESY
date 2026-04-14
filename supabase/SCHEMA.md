# BLDESY Database Schema Reference

Consolidated view of the current database state, derived from 14 migrations.
Last updated: April 2026.

## Tables

### profiles
User accounts (auto-created via `handle_new_user` trigger on signup).
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | FK → auth.users(id) |
| role | text NOT NULL | CHECK: customer, builder, enterprise |
| name | text | |
| avatar_url | text | |
| phone | text | |
| is_admin | boolean | Default false, protected by trigger |

### builder_profiles
Extended builder data. One per user (`user_id` UNIQUE NOT NULL).
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid UNIQUE NOT NULL | FK → auth.users |
| business_name | text | |
| trade_category | text | |
| bio | text | CHECK: max 2000 chars |
| phone | text | CHECK: digits 8-15 |
| suburb | text | |
| postcode | text | |
| latitude | float | |
| longitude | float | |
| radius_km | integer | |
| abn | text | CHECK: 11 digits |
| license_key | text | |
| cover_photo_url | text | |
| profile_photo_url | text | |
| specialties | jsonb | |
| projects | jsonb | |
| team | jsonb | |
| faqs | jsonb | |
| availability | text | |
| urgency_capacity | text[] | |
| website | text | |
| approved | boolean | Protected by trigger |
| subscription_tier | text | CHECK: free, standard, premium. Protected by trigger |
| credentials_verified | jsonb | Protected by trigger |

### jobs
Job postings by customers or enterprises.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| customer_id | uuid NOT NULL | FK → auth.users |
| title | text | |
| description | text | |
| trade_category | text | |
| suburb | text | |
| postcode | text | |
| urgency | text | CHECK: emergency, urgent, soon, planned, flexible |
| status | text | CHECK: open, in_progress, closed, filled, cancelled |
| contact_phone | text | |
| contact_email | text | |
| poster_type | text | Default 'customer' |
| workers_needed | integer | Default 1 |
| day_rate | text | |
| contract_duration | text | |
| start_date | date | |
| site_requirements | text | |
| created_at | timestamptz | |

### applications
Builder applications to jobs.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| job_id | uuid NOT NULL | FK → jobs ON DELETE CASCADE |
| builder_id | uuid NOT NULL | FK → auth.users |
| status | text | CHECK: pending, accepted, rejected, withdrawn |
| message | text | |
| created_at | timestamptz | |

### reviews
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| job_id | uuid NOT NULL | FK → jobs ON DELETE CASCADE |
| reviewer_id | uuid NOT NULL | FK → auth.users |
| reviewee_id | uuid NOT NULL | FK → auth.users |
| rating | integer NOT NULL | CHECK: 1-5 |
| comment | text | |
| created_at | timestamptz | |
| UNIQUE | (job_id, reviewer_id) | One review per reviewer per job |

### saved_builders
| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid | FK → auth.users |
| builder_id | uuid | FK → builder_profiles |
| created_at | timestamptz | |

### conversations
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user1_id | uuid | Normalised: user1_id < user2_id |
| user2_id | uuid | |
| unread_count_user1 | integer | |
| unread_count_user2 | integer | |
| last_message_text | text | |
| last_message_at | timestamptz | |

### messages
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| conversation_id | uuid | FK → conversations |
| sender_id | uuid | FK → auth.users |
| body | text | |
| attachment_url | text | |
| attachment_type | text | |
| created_at | timestamptz | |

### notifications
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | FK → auth.users |
| type | text | |
| title | text | |
| body | text | |
| metadata | jsonb | |
| read | boolean | Default false |
| created_at | timestamptz | |

### enterprise_profiles
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | FK → auth.users |
| company_name | text | |
| abn | text | |
| contact_name | text | |
| contact_email | text | |
| contact_phone | text | |
| status | text | Protected by trigger |
| approved | boolean | Protected by trigger |
| subscription_tier | text | |

### enterprise_subscriptions, enterprise_payments
Subscription and payment tracking for enterprise users.

### job_photos, job_documents
File attachments for jobs (FK → jobs ON DELETE CASCADE).

### rate_limit_log
DB-level rate limiting (user_id, action, created_at). RLS denies direct reads.

### job_views
View tracking for analytics (job_id, viewer_id, created_at).

## Key RPC Functions
- `get_builder_contact(p_builder_id)` — auth-gated builder phone/email
- `get_job_contact(p_job_id)` — auth-gated job customer contact
- `increment_unread(p_conversation_id, p_column)` — atomic unread counter
- `admin_set_builder_approved(p_builder_id, p_approved)` — admin only
- `admin_set_enterprise_status(p_enterprise_id, p_status, p_rejection_reason)` — admin only
- `set_role_enterprise()` — enterprise role upgrade (requires enterprise_profiles row)
- `check_rate_limit(p_user_id, p_action, p_limit, p_window_seconds)` — DB rate limiting

## Security Triggers
- `handle_new_user()` — auto-creates profiles row, blocks role injection
- `protect_profiles_role()` — prevents client-side role/is_admin changes
- `protect_builder_profiles_admin_cols()` — prevents approved/subscription_tier changes
- `protect_builder_credentials()` — prevents credentials_verified tampering
- `protect_enterprise_profiles_admin_cols()` — prevents enterprise admin column changes
- `enforce_job_post_rate_limit()` — 10 jobs/day per user
- `enforce_message_rate_limit()` — 60 messages/min per user
- `enforce_application_rate_limit()` — 20 applications/day per user

## Storage Buckets
- `builder-media` — public read, user-scoped write
- `job-photos` — public read, user-scoped write
- `job-documents` — private, owner-only read/write

## Realtime
Enabled on: conversations, messages, notifications
