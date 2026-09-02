/**
 * Trade option lists for the select sheets — the website's `<optgroup>` per
 * category (wizard trade picker, contract role trades) and the flat
 * `getAllTrades()` list (the /jobs "All trades" filter).
 */
import { TRADE_CATEGORIES, getAllTrades } from '@/lib/web/trades';

import type { SelectGroup, SelectOption } from './select-sheet';

export const TRADE_SELECT_GROUPS: SelectGroup<string>[] = TRADE_CATEGORIES.map((category) => ({
  label: category.name,
  options: category.trades.map((trade) => ({ value: trade.slug, label: trade.name })),
}));

export const ALL_TRADE_OPTIONS: SelectOption<string>[] = getAllTrades().map((trade) => ({
  value: trade.slug,
  label: trade.name,
}));
