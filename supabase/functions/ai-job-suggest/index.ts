import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0';
import { aiJobSuggestLimiter, checkRateLimit } from '../_shared/rate-limit.ts';
import { corsOk, jsonResponse } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsOk(req);

  try {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;

    const { allowed } = await checkRateLimit(aiJobSuggestLimiter, auth.user.id);
    if (!allowed) {
      return jsonResponse(
        { error: 'Too many requests — please wait a moment' },
        req, 429, { 'Retry-After': '60' },
      );
    }

    const { title, trade_type, mode = 'suggest' } = await req.json();

    if (!title || typeof title !== 'string') {
      return jsonResponse({ error: 'title string required' }, req, 400);
    }

    // ── Input validation ──
    if (title.length > 200) {
      return jsonResponse({ error: 'Title must be 200 characters or less' }, req, 400);
    }
    if (trade_type && (typeof trade_type !== 'string' || trade_type.length > 50)) {
      return jsonResponse({ error: 'Trade type must be 50 characters or less' }, req, 400);
    }
    if (mode !== 'suggest' && mode !== 'describe') {
      return jsonResponse({ error: 'Mode must be "suggest" or "describe"' }, req, 400);
    }

    const client = new Anthropic();

    if (mode === 'describe') {
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

      return jsonResponse({ description }, req);
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
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleaned);

    return jsonResponse({
      suggested_trade: result.suggested_trade ?? null,
      suggested_urgency: result.suggested_urgency ?? null,
      clarifying_question: result.clarifying_question ?? null,
    }, req);
  } catch (error: any) {
    console.error('ai-job-suggest error:', error);
    return jsonResponse({ error: 'Internal server error' }, req, 500);
  }
});
