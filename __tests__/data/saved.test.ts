import { describe, expect, it, vi } from 'vitest';

import { orderBySavedIds } from '@/lib/data/saved';

vi.mock('@/lib/supabase', () => import('./mocks/supabase-mock'));
vi.mock('@/lib/auth-context', () => import('./mocks/auth-context-mock'));

describe('orderBySavedIds', () => {
  it('returns rows in the saved order and drops ids with no visible row', () => {
    const rows = [{ user_id: 'b' }, { user_id: 'a' }, { user_id: 'c' }];
    expect(orderBySavedIds(['c', 'missing', 'a', 'b'], rows)).toEqual([{ user_id: 'c' }, { user_id: 'a' }, { user_id: 'b' }]);
  });

  it('handles empty inputs', () => {
    expect(orderBySavedIds([], [{ user_id: 'a' }])).toEqual([]);
    expect(orderBySavedIds(['a'], [])).toEqual([]);
  });
});
