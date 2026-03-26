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

/**
 * Geocode a query string using OpenStreetMap Nominatim.
 * Returns { latitude, longitude } or null.
 */
async function geocode(query: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const encoded = encodeURIComponent(`${query}, Australia`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=au`,
      { headers: { 'User-Agent': 'BLDESY-App/1.0' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.length === 0) return null;
    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  try {
    // ── Admin-only: require service_role key ──
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
      return new Response(JSON.stringify({ error: 'Forbidden — admin access only' }), {
        status: 403,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // Use service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch builders with missing coordinates
    const { data: builders, error: fetchError } = await supabase
      .from('builder_profiles')
      .select('id, suburb, postcode, latitude, longitude')
      .or('latitude.is.null,longitude.is.null');

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    if (!builders || builders.length === 0) {
      return new Response(JSON.stringify({ message: 'No builders need geocoding', updated: 0 }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const results: { id: string; suburb: string; postcode: string; success: boolean; lat?: number; lon?: number }[] = [];

    for (const builder of builders) {
      // Nominatim rate limit: 1 request per second
      await new Promise((r) => setTimeout(r, 1100));

      const geo = await geocode(`${builder.suburb} ${builder.postcode}`);

      if (geo) {
        const { error: updateError } = await supabase
          .from('builder_profiles')
          .update({ latitude: geo.latitude, longitude: geo.longitude })
          .eq('id', builder.id);

        results.push({
          id: builder.id,
          suburb: builder.suburb,
          postcode: builder.postcode,
          success: !updateError,
          lat: geo.latitude,
          lon: geo.longitude,
        });
      } else {
        results.push({
          id: builder.id,
          suburb: builder.suburb,
          postcode: builder.postcode,
          success: false,
        });
      }
    }

    const updated = results.filter((r) => r.success).length;

    return new Response(
      JSON.stringify({ message: `Geocoded ${updated}/${builders.length} builders`, results }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
