import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, api } from '@/lib/api';
import {
  GENERIC_FORM_ERROR,
  TRADIE_AREA_ZONE_SLUGS,
  WAITLIST_NETWORK_ERROR,
  WAITLIST_SOURCES,
  buildCallbackRequestBody,
  buildContactBody,
  buildSmsLinkBody,
  buildTradieAreaWaitlistBody,
  buildWaitlistDetailsBody,
  buildWaitlistJoinBody,
  fetchFoundingSpots,
  fetchSupplySpots,
  firstTouchFields,
  publicFormErrorMessage,
  suggestSuburbs,
  supplySpotsPath,
} from '@/lib/data/public-forms';

vi.mock('@/lib/api', () => import('./mocks/api-mock'));

const get = api.get as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  get.mockReset();
});

const touch = { referrer: 'https://g.example', source: 'meta', medium: 'cpc', campaign: 'launch', content: 'ad-1', term: null };

describe('firstTouchFields', () => {
  it('spreads utm_* + first_referrer, dropping nulls; empty when no touch', () => {
    expect(firstTouchFields(touch)).toEqual({
      utm_source: 'meta',
      utm_medium: 'cpc',
      utm_campaign: 'launch',
      utm_content: 'ad-1',
      utm_term: undefined,
      first_referrer: 'https://g.example',
    });
    expect(firstTouchFields(null)).toEqual({});
  });
});

describe('buildWaitlistJoinBody', () => {
  it('mirrors the web form: consents ride only with their channel, honeypot empty', () => {
    const body = buildWaitlistJoinBody({
      suburb: ' Newtown ',
      email: 'a@b.c',
      phone: '',
      source: 'search_miss',
      trade_category: 'plumber',
      searched_trade: 'tiler',
      searched_suburb: 'Newtown',
      sms_opt_in: true,
      marketing_opt_in: true,
      referral_code: ' MATE-ABC ',
      firstTouch: touch,
    });
    expect(body).toMatchObject({
      suburb: 'Newtown',
      postcode: null,
      email: 'a@b.c',
      phone: null,
      trade_category: 'plumber',
      source: 'search_miss',
      searched_trade: 'tiler',
      searched_suburb: 'Newtown',
      company: '',
      referral_code: 'MATE-ABC',
      marketing_opt_in: true,
      utm_source: 'meta',
      first_referrer: 'https://g.example',
    });
    expect(body.sms_opt_in).toBeUndefined(); // no phone → no SMS consent
  });

  it('phone-only joins carry sms_opt_in but never marketing_opt_in', () => {
    const body = buildWaitlistJoinBody({ suburb: 'Newtown', phone: '0400000000', source: 'home_hero', sms_opt_in: true, marketing_opt_in: true });
    expect(body.phone).toBe('0400000000');
    expect(body.email).toBeNull();
    expect(body.sms_opt_in).toBe(true);
    expect(body.marketing_opt_in).toBeUndefined();
    expect(body.referral_code).toBeNull();
    expect('utm_source' in body).toBe(false);
  });

  it('types the surface list from the website', () => {
    expect(WAITLIST_SOURCES).toEqual(['waitlist_page', 'gated_redirect', 'search_miss', 'trade_landing', 'coverage_map', 'blog_cta', 'home_hero']);
  });
});

describe('buildWaitlistDetailsBody', () => {
  it('mirrors step 2: blanks → null, SMS consent only when a phone is added', () => {
    expect(
      buildWaitlistDetailsBody({ details_token: 'tok', job_description: ' Burst pipe ', entry_type: 'job', urgency: 'asap', marketing_opt_in: false, sms_opt_in: true }),
    ).toEqual({
      details_token: 'tok',
      job_description: 'Burst pipe',
      entry_type: 'job',
      trade_category: null,
      sub_trade: null,
      urgency: 'asap',
      phone: null,
      email: null,
      referral_code: null,
      marketing_opt_in: false,
      sms_opt_in: undefined,
    });
    expect(buildWaitlistDetailsBody({ details_token: 'tok', phone: '0400', sms_opt_in: true }).sms_opt_in).toBe(true);
  });
});

describe('other form bodies', () => {
  it('contact trims the three fields', () => {
    expect(buildContactBody({ name: ' A ', email: ' a@b.c ', message: ' hello there ' })).toEqual({ name: 'A', email: 'a@b.c', message: 'hello there' });
  });

  it('callback request: honeypot empty, utm_* without first_referrer, blanks dropped', () => {
    const body = buildCallbackRequestBody({ name: ' Sam ', phone: ' 0400 000 000 ', trade: '', qualifier: 'Yes', firstTouch: touch });
    expect(body).toEqual({
      name: 'Sam',
      phone: '0400 000 000',
      trade: undefined,
      qualifier: 'Yes',
      event_id: undefined,
      company: '',
      utm_source: 'meta',
      utm_medium: 'cpc',
      utm_campaign: 'launch',
      utm_content: 'ad-1',
      utm_term: undefined,
    });
    expect('first_referrer' in body).toBe(false);
  });

  it('sms link: first name + phone + source + honeypot', () => {
    expect(buildSmsLinkBody({ first_name: ' Sam ', phone: '0400000000', source: 'for_tradies' })).toEqual({
      first_name: 'Sam',
      phone: '0400000000',
      source: 'for_tradies',
      company: '',
    });
  });

  it('tradie area waitlist: optional contact dropped when blank', () => {
    expect(buildTradieAreaWaitlistBody({ trade_category: 'plumber', zone_slug: 'outside-launch-area', email: ' a@b.c ', phone: '', source: 'wizard' })).toEqual({
      trade_category: 'plumber',
      zone_slug: 'outside-launch-area',
      contact_name: undefined,
      phone: undefined,
      email: 'a@b.c',
      source: 'wizard',
      company: '',
    });
    expect(TRADIE_AREA_ZONE_SLUGS).toContain('outside-launch-area');
    expect(TRADIE_AREA_ZONE_SLUGS.length).toBeGreaterThan(1);
  });
});

describe('publicFormErrorMessage', () => {
  it('uses the server copy for HTTP errors and the form\'s connection copy otherwise', () => {
    expect(publicFormErrorMessage(new ApiError(400, 'Add your name.'))).toBe('Add your name.');
    expect(publicFormErrorMessage(new TypeError('x'), WAITLIST_NETWORK_ERROR)).toBe(WAITLIST_NETWORK_ERROR);
    expect(publicFormErrorMessage(undefined)).toBe(GENERIC_FORM_ERROR);
  });
});

describe('supply counters', () => {
  it('supplySpotsPath encodes the trade', () => {
    expect(supplySpotsPath('pest_control')).toBe('/api/supply/spots?trade=pest_control');
  });

  it('fetchSupplySpots returns zones on ok, null on unknown trade / { ok:false } / failure', async () => {
    const zones = [{ zoneSlug: 'inner-west', zoneName: 'Inner West', cap: 10, taken: 3, remaining: 7 }];
    get.mockResolvedValue({ ok: true, trade: 'plumber', zones });
    await expect(fetchSupplySpots('plumber')).resolves.toEqual(zones);
    expect(get).toHaveBeenCalledWith('/api/supply/spots?trade=plumber');

    await expect(fetchSupplySpots('not-a-trade')).resolves.toBeNull();
    get.mockResolvedValue({ ok: false });
    await expect(fetchSupplySpots('plumber')).resolves.toBeNull();
    get.mockRejectedValue(new Error('offline'));
    await expect(fetchSupplySpots('plumber')).resolves.toBeNull();
  });

  it('fetchFoundingSpots returns the counter or null', async () => {
    get.mockResolvedValue({ ok: true, cap: 200, taken: 42, remaining: 158 });
    await expect(fetchFoundingSpots()).resolves.toEqual({ cap: 200, taken: 42, remaining: 158 });
    get.mockResolvedValue({ ok: false });
    await expect(fetchFoundingSpots()).resolves.toBeNull();
  });
});

describe('suggestSuburbs', () => {
  it('short-circuits below two characters and swallows failures', async () => {
    await expect(suggestSuburbs('n')).resolves.toEqual([]);
    expect(get).not.toHaveBeenCalled();
    get.mockResolvedValue({ suggestions: ['Newtown', 'Newport'] });
    await expect(suggestSuburbs('new')).resolves.toEqual(['Newtown', 'Newport']);
    expect(get).toHaveBeenCalledWith('/api/suburbs?q=new');
    get.mockRejectedValue(new Error('offline'));
    await expect(suggestSuburbs('new')).resolves.toEqual([]);
  });
});
