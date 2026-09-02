import { describe, expect, it } from 'vitest';

import { PUSH_ROUTE_FALLBACK, isAllowedPushRoute, webRouteToAppHref } from '@/lib/data/push-routes';

const JOB = '0f8fad5b-d9cb-469f-a165-70867728950e';
const CONVO = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

describe('webRouteToAppHref — allowed website push routes pass through 1:1', () => {
  it.each([
    [`/jobs/${JOB}`],
    ['/jobs'],
    ['/my-jobs'],
    ['/portal'],
    ['/portal/pending'],
    ['/portal/refer'],
    ['/portal/billing'],
    [`/portal/jobs/${JOB}`],
    ['/portal/edit-profile'],
    ['/portal/edit-profile?step=2'],
    ['/messages'],
    [`/messages?c=${CONVO}`],
    ['/dashboard'],
    ['/dashboard/profile'],
    ['/dashboard/jobs'],
    ['/dashboard/saved'],
    ['/dashboard/messages'],
    [`/enterprise/jobs/${JOB}`],
    ['/enterprise'],
    ['/settings'],
    [`/builder/${JOB}`],
  ])('%s', (route) => {
    expect(webRouteToAppHref(route)).toBe(route);
    expect(isAllowedPushRoute(route)).toBe(true);
  });

  it('trims surrounding whitespace before matching', () => {
    expect(webRouteToAppHref('  /portal  ')).toBe('/portal');
  });

  it('accepts upper-case hex in uuids', () => {
    expect(webRouteToAppHref(`/jobs/${JOB.toUpperCase()}`)).toBe(`/jobs/${JOB.toUpperCase()}`);
  });
});

describe('webRouteToAppHref — rejects everything else with the "/" fallback', () => {
  it.each([
    ['https://evil.example/portal', 'absolute URL with a host'],
    ['//evil.example/portal', 'protocol-relative URL'],
    ['portal', 'missing leading slash'],
    ['/portal/../settings', 'dot segments'],
    ['/messages?c=<script>', 'unsafe characters'],
    ['/messages?c=not-a-uuid', 'non-uuid conversation id'],
    ['/jobs/123', 'non-uuid job id'],
    ['/portal/edit-profile?step=9', 'step outside 1-6'],
    ['/portal/unknown', 'portal page the app has no screen for'],
    ['/dashboard/Profile', 'upper-case dashboard segment'],
    ['/dashboard//profile', 'empty dashboard segment'],
    ['/admin', 'admin console'],
    ['/plumber/newtown/harbour-city-plumbing', 'keyword profile URL (needs a slug lookup)'],
    ['/jobs/', 'trailing slash'],
    ['', 'empty string'],
    ['   ', 'whitespace only'],
  ])('%s → "/" (%s)', (route) => {
    expect(webRouteToAppHref(route)).toBe(PUSH_ROUTE_FALLBACK);
    expect(isAllowedPushRoute(route.trim())).toBe(false);
  });

  it('handles undefined, null and non-strings', () => {
    expect(webRouteToAppHref(undefined)).toBe('/');
    expect(webRouteToAppHref(null)).toBe('/');
    expect(webRouteToAppHref(42 as unknown as string)).toBe('/');
    expect(webRouteToAppHref({} as unknown as string)).toBe('/');
  });
});
