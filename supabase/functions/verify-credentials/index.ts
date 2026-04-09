/**
 * verify-credentials Edge Function
 *
 * Verifies ABN against ABR and trade licences against NSW APIs.
 * Persists results to builder_profiles.credentials_verified using service role.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// ── Rate limiter ──
const rateLimitMap = new Map<string, number[]>();
function checkRateLimit(userId: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) return false;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return true;
}

// ── NSW OAuth token cache ──
const tokenCache = new Map<string, { access_token: string; expires_at: number }>();

async function getNswAccessToken(apiKey: string, apiSecret: string): Promise<string> {
  const cached = tokenCache.get(apiKey);
  if (cached && Date.now() < cached.expires_at) return cached.access_token;

  const credentials = btoa(`${apiKey}:${apiSecret}`);
  const res = await fetch(
    'https://api.nsw.gov.au/oauth/client_credential/accesstoken?grant_type=client_credentials',
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );

  if (!res.ok) throw new Error(`NSW OAuth failed: ${res.status}`);
  const data = await res.json();

  tokenCache.set(apiKey, {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  });

  return data.access_token;
}

// ── NSW API verifier factory ──
interface NswLicenceResult {
  licenceNumber: string;
  licenceeName: string;
  status: string;
  category: string;
  expiryDate: string | null;
}

function createNswVerifier(apiKeyEnv: string, apiSecretEnv: string, baseUrl: string) {
  return async (licenceNumber: string): Promise<NswLicenceResult | null> => {
    const apiKey = Deno.env.get(apiKeyEnv);
    const apiSecret = Deno.env.get(apiSecretEnv);
    if (!apiKey || !apiSecret) return null;

    const token = await getNswAccessToken(apiKey, apiSecret);
    const res = await fetch(
      `${baseUrl}/v1/verify?licenceNumber=${encodeURIComponent(licenceNumber)}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    );

    if (!res.ok) return null;
    const data = await res.json();
    if (!data || (!data.licenceNumber && !data.LicenceNumber)) return null;

    return {
      licenceNumber: data.licenceNumber || data.LicenceNumber || '',
      licenceeName: data.licenceeName || data.LicenceeName || data.name || '',
      status: data.status || data.Status || '',
      category: data.category || data.Category || data.licenceClass || '',
      expiryDate: data.expiryDate || data.ExpiryDate || null,
    };
  };
}

const nswVerifiers: Record<string, (l: string) => Promise<NswLicenceResult | null>> = {
  nsw_trades_api: createNswVerifier('NSW_TRADES_API_KEY', 'NSW_TRADES_API_SECRET', 'https://api.nsw.gov.au/trades'),
  nsw_security_api: createNswVerifier('NSW_SECURITY_API_KEY', 'NSW_SECURITY_API_SECRET', 'https://api.nsw.gov.au/security'),
  nsw_asbestos_api: createNswVerifier('NSW_ASBESTOS_API_KEY', 'NSW_ASBESTOS_API_SECRET', 'https://api.nsw.gov.au/asbestos'),
  nsw_design_api: createNswVerifier('NSW_DESIGN_API_KEY', 'NSW_DESIGN_API_SECRET', 'https://api.nsw.gov.au/design'),
  nsw_highrisk_api: createNswVerifier('NSW_HIGHRISK_API_KEY', 'NSW_HIGHRISK_API_SECRET', 'https://api.nsw.gov.au/highrisk'),
  nsw_whitecard_api: createNswVerifier('NSW_WHITECARD_API_KEY', 'NSW_WHITECARD_API_SECRET', 'https://api.nsw.gov.au/whitecard'),
};

// ── ABR lookup ──
async function lookupAbn(abn: string) {
  const guid = Deno.env.get('ABR_GUID');
  if (!guid) return null;

  const digits = abn.replace(/\D/g, '');
  if (digits.length !== 11) return null;

  try {
    const res = await fetch(
      `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${digits}&callback=callback&guid=${guid}`,
    );
    const text = await res.text();
    const jsonStr = text.replace(/^callback\(/, '').replace(/\);?\s*$/, '');
    const data = JSON.parse(jsonStr);
    if (data.Message) return null;

    return {
      abn: data.Abn,
      entityName: data.EntityName || [data.GivenName, data.FamilyName].filter(Boolean).join(' ') || '',
      status: data.AbnStatus,
      state: data.AddressState,
    };
  } catch {
    return null;
  }
}

// ── Trade licence map (inline subset) ──
const TRADE_LICENCE_MAP: Record<string, Record<string, { display_label: string; source: string } | null>> = {
  builder: { nsw: { display_label: 'NSW Builder Licence', source: 'nsw_trades_api' }, qld: { display_label: 'QBCC Builder', source: 'qbcc_register' } },
  carpenter: { nsw: { display_label: 'NSW Carpentry Licence', source: 'nsw_trades_api' }, qld: { display_label: 'QBCC Carpentry', source: 'qbcc_register' } },
  electrician: { nsw: { display_label: 'NSW Electrical Licence', source: 'nsw_trades_api' }, qld: { display_label: 'QBCC Electrical', source: 'qbcc_register' } },
  plumber: { nsw: { display_label: 'NSW Plumbing Licence', source: 'nsw_trades_api' }, qld: { display_label: 'QBCC Plumbing', source: 'qbcc_register' } },
  'gas-fitter': { nsw: { display_label: 'NSW Gas Fitting Licence', source: 'nsw_trades_api' }, qld: { display_label: 'QBCC Gas Fitting', source: 'qbcc_register' } },
  roofer: { nsw: { display_label: 'NSW Roofing Licence', source: 'nsw_trades_api' }, qld: { display_label: 'QBCC Roofing', source: 'qbcc_register' } },
  waterproofer: { nsw: { display_label: 'NSW Waterproofing Licence', source: 'nsw_trades_api' }, qld: { display_label: 'QBCC Waterproofing', source: 'qbcc_register' } },
  glazier: { nsw: { display_label: 'NSW Glazier Licence', source: 'nsw_trades_api' }, qld: { display_label: 'QBCC Glazing', source: 'qbcc_register' } },
  locksmith: { nsw: { display_label: 'NSW Security Licence', source: 'nsw_security_api' }, qld: null },
  'asbestos-removal': { nsw: { display_label: 'NSW Asbestos Licence', source: 'nsw_asbestos_api' }, qld: { display_label: 'QBCC Asbestos', source: 'qbcc_register' } },
  demolition: { nsw: { display_label: 'NSW Demolition Licence', source: 'nsw_asbestos_api' }, qld: { display_label: 'QBCC Demolition', source: 'qbcc_register' } },
  scaffolder: { nsw: { display_label: 'HRW Scaffolding Licence', source: 'nsw_highrisk_api' }, qld: { display_label: 'QBCC Scaffolding', source: 'qbcc_register' } },
  // Unlicensed trades
  painter: { nsw: null, qld: null },
  tiler: { nsw: null, qld: null },
  landscaper: { nsw: null, qld: null },
  fencer: { nsw: null, qld: null },
  handyman: { nsw: null, qld: null },
  cleaner: { nsw: null, qld: null },
  plasterer: { nsw: null, qld: null },
};

function getLicenceReq(trade: string, state: string) {
  const entry = TRADE_LICENCE_MAP[trade.toLowerCase()];
  if (!entry) return undefined;
  return entry[state.toLowerCase()] ?? undefined;
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: CORS_HEADERS });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
    }

    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: CORS_HEADERS });
    }

    const body = await req.json();
    const { abn, licence_number, state, trade_category, existing_credentials } = body;

    if (!abn && !licence_number && !trade_category) {
      return new Response(JSON.stringify({ error: 'Provide ABN, licence number, or trade category' }), { status: 400, headers: CORS_HEADERS });
    }

    const existing = existing_credentials || {};
    const now = new Date().toISOString();
    const errors: string[] = [];
    let abn_verified = false;
    let licence_verified = false;

    // 1. ABN Verification
    if (abn) {
      const result = await lookupAbn(abn);
      if (!result) {
        errors.push('ABN not found in the Australian Business Register');
      } else if (result.status !== 'Active') {
        errors.push(`ABN status is "${result.status}" — must be Active`);
      } else {
        existing.abn = {
          number: abn.replace(/\D/g, ''),
          verified: true,
          verified_at: now,
          entity_name: result.entityName,
          status: result.status,
        };
        abn_verified = true;
        if (!state && result.state) existing.state = result.state;
      }
    }

    // 2. Licence Verification
    const builderState = state || '';
    const tradeCategory = trade_category || '';

    if (builderState && tradeCategory) {
      const requirement = getLicenceReq(tradeCategory, builderState);

      if (requirement === null) {
        licence_verified = true;
        errors.push('No licence is required for this trade in your state.');
      } else if (requirement === undefined) {
        errors.push('Licence requirements not mapped for this trade/state combination');
      } else if (!licence_number) {
        errors.push(`A ${requirement.display_label} is required — enter your licence number.`);
      } else if (requirement.source === 'admin') {
        existing.licences = [
          ...(existing.licences || []).filter((l: any) => l.type !== tradeCategory),
          { type: tradeCategory, licence_number, verified: false, status: 'Pending Admin Review', display_label: requirement.display_label, source: 'admin', verification_method: 'admin' },
        ];
        errors.push('This licence type requires admin verification.');
      } else if (builderState.toUpperCase() === 'NSW' && requirement.source in nswVerifiers) {
        const verifier = nswVerifiers[requirement.source];
        const nswResult = await verifier(licence_number);

        if (!nswResult) {
          errors.push(`Licence not found in the ${requirement.display_label} register`);
        } else if (nswResult.status.toLowerCase() !== 'current' && nswResult.status.toLowerCase() !== 'active') {
          errors.push(`Licence status is "${nswResult.status}" — must be Current`);
        } else {
          existing.licences = [
            ...(existing.licences || []).filter((l: any) => l.type !== tradeCategory),
            {
              type: tradeCategory,
              licence_number,
              verified: true,
              verified_at: now,
              status: nswResult.status,
              category: nswResult.category,
              display_label: requirement.display_label,
              source: requirement.source,
              verification_method: 'api',
            },
          ];
          licence_verified = true;
        }
      } else if (builderState.toUpperCase() === 'QLD' && requirement.source === 'qbcc_register') {
        const { data: qbccRow } = await supabase
          .from('qbcc_licence_register')
          .select('licence_number, licensee_name, licence_class')
          .eq('licence_number', licence_number)
          .single();

        if (!qbccRow) {
          errors.push('Licence not found in the QBCC register');
        } else {
          existing.licences = [
            ...(existing.licences || []).filter((l: any) => l.type !== tradeCategory),
            {
              type: tradeCategory,
              licence_number,
              verified: true,
              verified_at: now,
              status: 'Current',
              category: (qbccRow as any).licence_class || '',
              display_label: requirement.display_label,
              source: 'qbcc_register',
              verification_method: 'api',
            },
          ];
          licence_verified = true;
        }
      }
    }

    existing.state = builderState || existing.state;

    // Persist with service role key
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error: persistError } = await admin
      .from('builder_profiles')
      .update({ credentials_verified: existing })
      .eq('user_id', user.id);

    if (persistError) {
      return new Response(JSON.stringify({ error: 'Failed to save credentials' }), { status: 500, headers: CORS_HEADERS });
    }

    return new Response(
      JSON.stringify({ success: true, abn_verified, licence_verified, errors, credentials_verified: existing }),
      { headers: CORS_HEADERS },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: CORS_HEADERS });
  }
});
