# Supabase

The website repo (`~/bldesy-web/supabase/`) owns the database schema, migrations and every Edge Function the app calls (`ai-chat`, `ai-job-suggest`). This app never runs `supabase db push` and keeps no function sources; cross-user reads use the PII-safe views and business writes go through the website API (see CLAUDE.md).
