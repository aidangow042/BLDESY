import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').filter(Boolean);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

/* ── Rate limiter: 10 requests/hour per user ── */
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 3_600_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT) return false;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return true;
}

type BuilderRec = {
  id: string;
  business_name: string;
  trade_category: string;
  suburb: string;
  postcode: string;
  bio: string | null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  try {
    // ── Auth: verify the caller is a logged-in user ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
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
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // ── Rate limit: 20 requests/minute per user ──
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests — please wait a moment before trying again' }),
        { status: 429, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json', 'Retry-After': '60' } },
      );
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array required' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // ── Input validation ──
    if (messages.length > 30) {
      return new Response(
        JSON.stringify({ error: 'Too many messages — please start a new conversation' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }
    for (const m of messages) {
      if (!m.role || !['user', 'assistant'].includes(m.role)) {
        return new Response(
          JSON.stringify({ error: 'Each message must have a valid role (user or assistant)' }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
        );
      }
      if (typeof m.content !== 'string' || m.content.length === 0 || m.content.length > 2000) {
        return new Response(
          JSON.stringify({ error: 'Each message content must be 1-2000 characters' }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
        );
      }
    }

    const client = new Anthropic();

    // Single Claude call: reply + extract search params
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: `You are the AI assistant for BLDESY!, an Australian trade connection platform.
You help customers find the right tradie, understand costs, and describe their job.

CONVERSATION STYLE:
- You're a knowledgeable Aussie mate who knows the trades inside out.
- Always acknowledge what the user actually said before responding — show you listened.
- If they greet you casually ("hey", "hi", "help me with this"), respond naturally and ask what kind of job or tradie they're after. Don't give a generic welcome speech.
- Keep replies to 2-4 short sentences. Be direct but warm.
- If listing items, use bullet points (max 4 bullets, one line each).
- Use Aussie terms naturally: tradie, job, quote, reno, sparky, chippy, etc.
- Never repeat the user's question back word-for-word.
- No robotic filler: "Great question!", "I'd be happy to help!", "Sure thing!".
- Give a quick useful answer, then ask ONE specific follow-up to narrow things down.
- If the user is vague, ask about: what trade they need, where the job is, and how urgent it is.

EXAMPLES OF GOOD RESPONSES:
User: "Hey help me with this"
Good: "Hey! What kind of job are you looking at — reno, repairs, something else? And whereabouts are you based?"
Bad: "G'day! I'm here to help you find a tradie, understand costs, or describe your job. What do you need?"

User: "I need a plumber"
Good: "Easy — whereabouts do you need the plumber, and is it urgent (like a burst pipe) or more of a planned job?"

SEARCH EXTRACTION:
If the user is looking for a tradie or asking for recommendations, add this as the very last line of your response (on its own line, no other text on that line):
SEARCH:{"trade":"<trade>","location":"<suburb or null>","urgency":"<emergency|soon|planned or null>"}
- "trade" = the trade/skill (e.g. plumber, electrician, carpenter)
- "location" = suburb or area if mentioned, otherwise null
- "urgency" = map timing: "asap"/"urgent"/"today" → "emergency", "this week"/"few days" → "soon", "no rush"/"whenever" → "planned", otherwise null
- Only add the SEARCH line when the user wants to find a tradie. Do NOT add it for general questions about costs, advice, etc.
- The SEARCH line will be hidden from the user — it is metadata only.`,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const rawReply = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse out the SEARCH line if present
    const searchMatch = rawReply.match(/\nSEARCH:(\{.*\})\s*$/);
    const reply = searchMatch ? rawReply.replace(searchMatch[0], '').trim() : rawReply;

    let builders: BuilderRec[] = [];
    const searchParams: Record<string, string> = {};

    if (searchMatch) {
      try {
        const intent = JSON.parse(searchMatch[1]);
        const trade = intent.trade;
        const location = intent.location;
        const urgency = intent.urgency;

        // Sanitize trade: only allow alphanumeric + spaces + common chars
        const sanitizedTrade = trade ? trade.replace(/[^a-zA-Z0-9 &\-\/]/g, '').slice(0, 50) : null;

        if (sanitizedTrade) {
          searchParams.trade_category = sanitizedTrade;
          if (location && location !== 'null') searchParams.suburb = location;
          if (urgency && urgency !== 'null') {
            const urgencyMap: Record<string, string> = { emergency: 'asap', soon: 'this_week', planned: 'flexible' };
            searchParams.urgency = urgencyMap[urgency] ?? urgency;
          }

          // Query matching builders (anon key — RLS handles approved-only filtering)
          const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
          );

          const { data } = await supabase
            .from('builder_profiles')
            .select('id, business_name, trade_category, suburb, postcode, bio, urgency_capacity')
            .eq('approved', true)
            .ilike('trade_category', `%${sanitizedTrade}%`)
            .limit(10);

          if (data && data.length > 0) {
            let sorted = [...data];
            if (urgency) {
              const urgencyOrder: Record<string, string[]> = {
                emergency: ['emergency', 'soon', 'planned'],
                soon: ['soon', 'emergency', 'planned'],
                planned: ['planned', 'soon', 'emergency'],
              };
              const order = urgencyOrder[urgency] ?? [];
              sorted.sort((a, b) => {
                const scoreA = getUrgencyScore(a.urgency_capacity, order);
                const scoreB = getUrgencyScore(b.urgency_capacity, order);
                return scoreA - scoreB;
              });
            }

            builders = sorted.slice(0, 3).map((b) => ({
              id: b.id,
              business_name: b.business_name,
              trade_category: b.trade_category,
              suburb: b.suburb,
              postcode: b.postcode,
              bio: b.bio,
            }));
          }
        }
      } catch {
        // JSON parse failed — proceed without builders
      }
    }

    return new Response(JSON.stringify({
      reply,
      builders: builders.length > 0 ? builders : undefined,
      searchParams: Object.keys(searchParams).length > 0 ? searchParams : undefined,
    }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('ai-chat error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});

function getUrgencyScore(capacity: string[] | null, priorityOrder: string[]): number {
  if (!capacity || capacity.length === 0) return 99;
  let best = 99;
  for (const cap of capacity) {
    const idx = priorityOrder.indexOf(cap.toLowerCase());
    if (idx !== -1 && idx < best) best = idx;
  }
  return best;
}
