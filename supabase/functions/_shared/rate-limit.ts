/**
 * Shared persistent rate limiter using Upstash Redis.
 * Used by all Edge Functions that need per-user rate limiting.
 *
 * Required env vars:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

import { Redis } from 'npm:@upstash/redis@1.34.3';
import { Ratelimit } from 'npm:@upstash/ratelimit@2.0.5';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});

/**
 * Pre-configured rate limiters for each endpoint.
 * Uses sliding window algorithm for smooth rate limiting.
 */
export const aiChatLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'rl:ai-chat',
});

export const aiJobSuggestLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'rl:ai-job-suggest',
});

export const verifyCredentialsLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'rl:verify-credentials',
});

/**
 * Check rate limit for a user. Returns { allowed, remaining, resetMs }.
 * On Redis connection failure, allows the request (fail-open for availability).
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  userId: string,
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const result = await limiter.limit(userId);
    return { allowed: result.success, remaining: result.remaining };
  } catch {
    // Fail open — if Redis is down, don't block users
    return { allowed: true, remaining: -1 };
  }
}
