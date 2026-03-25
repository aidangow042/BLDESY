import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/* ── Rate limiter: 30 requests/minute per user ── */
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT) return false;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth: verify the caller is a logged-in user ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized — please sign in' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Rate limit: 30 requests/minute per user ──
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests — please wait a moment' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } },
      );
    }

    const { title, trade_type, mode = 'suggest' } = await req.json();

    if (!title || typeof title !== 'string') {
      return new Response(JSON.stringify({ error: 'title string required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Input validation ──
    if (title.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Title must be 200 characters or less' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (trade_type && (typeof trade_type !== 'string' || trade_type.length > 50)) {
      return new Response(
        JSON.stringify({ error: 'Trade type must be 50 characters or less' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (mode !== 'suggest' && mode !== 'describe') {
      return new Response(
        JSON.stringify({ error: 'Mode must be "suggest" or "describe"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const client = new Anthropic();

    if (mode === 'describe') {
      // Generate a job description from the title + trade
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: `You are a helpful assistant for an Australian trade platform called BLDESY!
Given a job title and optionally a trade type, write a clear 2-3 sentence job description that a tradie would find useful.
Include: what needs doing, relevant details a tradie should know, and the expected scope.
Use plain Australian English. Be specific but concise.
Return ONLY the description text — no JSON, no markdown, no quotes.`,
        messages: [
          {
            role: 'user',
            content: trade_type
              ? `Job title: "${title}"\nTrade: ${trade_type}\n\nWrite a job description.`
              : `Job title: "${title}"\n\nWrite a job description.`,
          },
        ],
      });

      const description =
        response.content[0].type === 'text' ? response.content[0].text.trim() : '';

      return new Response(JSON.stringify({ description }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default: suggest mode — classify trade + urgency from title
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: `You are a job classification assistant for an Australian trade platform.
Given a job title, return a JSON object with:
- "suggested_trade": the most likely trade category. MUST be one of: plumber, electrician, carpenter, builder, painter, tiler, roofer, landscaper, concreter, fencer, plasterer, bricklayer, handyman, other
- "suggested_urgency": likely urgency based on keywords. MUST be one of: asap, this_week, flexible. Use "asap" for words like leak, broken, burst, emergency, flooding, sparking, dangerous. Use "this_week" for repair, fix, replace. Use "flexible" for renovation, planning, build, install, new.
- "clarifying_question": a short one-sentence question to help refine the job, ONLY if the title is vague or ambiguous. Omit this field if the title is clear.

Return ONLY valid JSON. No markdown, no explanation.`,
      messages: [
        { role: 'user', content: `Job title: "${title}"` },
      ],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';

    // Parse the JSON response
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleaned);

    return new Response(
      JSON.stringify({
        suggested_trade: result.suggested_trade ?? null,
        suggested_urgency: result.suggested_urgency ?? null,
        clarifying_question: result.clarifying_question ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('ai-job-suggest error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
