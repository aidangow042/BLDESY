/**
 * Shared auth helper — validates JWT and returns user or error response.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { jsonResponse } from './cors.ts';

type AuthSuccess = { user: { id: string; email?: string }; error?: never };
type AuthFailure = { user?: never; error: Response };

/**
 * Validate the Authorization header and return the authenticated user.
 * Returns { user } on success, { error: Response } on failure.
 */
export async function requireUser(req: Request): Promise<AuthSuccess | AuthFailure> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { error: jsonResponse({ error: 'Missing authorization' }, req, 401) };
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );

  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', ''),
  );

  if (error || !user) {
    return { error: jsonResponse({ error: 'Unauthorized — please sign in' }, req, 401) };
  }

  return { user };
}
