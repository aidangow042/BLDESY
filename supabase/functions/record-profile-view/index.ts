/**
 * record-profile-view — service-role beacon that logs a builder profile view.
 *
 * profile_views has no INSERT policy (RLS only lets a builder READ their own
 * rows), so writes must go through the service role. Dedup — 1 view per builder
 * per viewer per UTC day — is enforced by a partial unique index, so we insert
 * and swallow the 23505 unique-violation, making repeat views a silent no-op.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsOk, jsonResponse } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsOk(req);

  try {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;

    const { builder_user_id } = await req.json().catch(() => ({}));

    if (!builder_user_id || typeof builder_user_id !== 'string' || builder_user_id.length > 64) {
      return jsonResponse({ error: 'builder_user_id required' }, req, 400);
    }

    // Self-views never count (also guarded by a CHECK constraint).
    if (builder_user_id === auth.user.id) {
      return jsonResponse({ ok: true, self: true }, req);
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error } = await adminClient.from('profile_views').insert({
      builder_user_id,
      viewer_user_id: auth.user.id,
    });

    // 23505 = unique violation → already counted today; treat as success.
    if (error && error.code !== '23505') {
      return jsonResponse({ error: 'Failed to record view' }, req, 500);
    }

    return jsonResponse({ ok: true }, req);
  } catch (_err) {
    return jsonResponse({ error: 'Unexpected error' }, req, 500);
  }
});
