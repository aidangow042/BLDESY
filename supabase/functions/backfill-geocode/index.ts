import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsOk, jsonResponse } from '../_shared/cors.ts';

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
  if (req.method === 'OPTIONS') return corsOk(req);

  try {
    // ── Admin-only: require service_role key ──
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
      return jsonResponse({ error: 'Forbidden — admin access only' }, req, 403);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: builders, error: fetchError } = await supabase
      .from('builder_profiles')
      .select('id, suburb, postcode, latitude, longitude')
      .or('latitude.is.null,longitude.is.null');

    if (fetchError) {
      return jsonResponse({ error: fetchError.message }, req, 500);
    }

    if (!builders || builders.length === 0) {
      return jsonResponse({ message: 'No builders need geocoding', updated: 0 }, req);
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

    return jsonResponse({ message: `Geocoded ${updated}/${builders.length} builders`, results }, req);
  } catch (_err) {
    return jsonResponse({ error: 'Internal server error' }, req, 500);
  }
});
