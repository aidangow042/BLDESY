/**
 * Shared trade → licence requirement map for Edge Functions.
 * Single source of truth — also mirrored in lib/trade-licence-map.ts for client-side display.
 */

export const TRADE_LICENCE_MAP: Record<string, Record<string, { display_label: string; source: string } | null>> = {
  builder: { nsw: { display_label: 'NSW Builder Licence', source: 'nsw_trades_api' }, qld: { display_label: 'QBCC Builder', source: 'qbcc_register' } },
  carpenter: { nsw: { display_label: 'NSW Carpentry Licence', source: 'nsw_trades_api' }, qld: { display_label: 'QBCC Carpentry', source: 'qbcc_register' } },
  concreter: { nsw: { display_label: 'NSW Concreting Licence', source: 'nsw_trades_api' }, qld: { display_label: 'QBCC Concreting', source: 'qbcc_register' } },
  bricklayer: { nsw: { display_label: 'NSW Bricklaying Licence', source: 'nsw_trades_api' }, qld: { display_label: 'QBCC Bricklaying', source: 'qbcc_register' } },
  electrician: { nsw: { display_label: 'NSW Electrical Licence', source: 'nsw_trades_api' }, qld: { display_label: 'QBCC Electrical', source: 'qbcc_register' } },
  'solar-installer': { nsw: { display_label: 'NSW Electrical Licence', source: 'nsw_trades_api' }, qld: { display_label: 'QBCC Electrical', source: 'qbcc_register' } },
  'air-conditioning': { nsw: { display_label: 'NSW HVAC Licence', source: 'nsw_trades_api' }, qld: { display_label: 'QBCC Mechanical', source: 'qbcc_register' } },
  plumber: { nsw: { display_label: 'NSW Plumbing Licence', source: 'nsw_trades_api' }, qld: { display_label: 'QBCC Plumbing', source: 'qbcc_register' } },
  'gas-fitter': { nsw: { display_label: 'NSW Gas Fitting Licence', source: 'nsw_trades_api' }, qld: { display_label: 'QBCC Gas Fitting', source: 'qbcc_register' } },
  roofer: { nsw: { display_label: 'NSW Roofing Licence', source: 'nsw_trades_api' }, qld: { display_label: 'QBCC Roofing', source: 'qbcc_register' } },
  waterproofer: { nsw: { display_label: 'NSW Waterproofing Licence', source: 'nsw_trades_api' }, qld: { display_label: 'QBCC Waterproofing', source: 'qbcc_register' } },
  glazier: { nsw: { display_label: 'NSW Glazier Licence', source: 'nsw_trades_api' }, qld: { display_label: 'QBCC Glazing', source: 'qbcc_register' } },
  'pool-builder': { nsw: { display_label: 'NSW Swimming Pool Building Licence', source: 'nsw_trades_api' }, qld: { display_label: 'QBCC Swimming Pool', source: 'qbcc_register' } },
  demolition: { nsw: { display_label: 'NSW Demolition Licence', source: 'nsw_asbestos_api' }, qld: { display_label: 'QBCC Demolition', source: 'qbcc_register' } },
  scaffolder: { nsw: { display_label: 'High Risk Work Licence - Scaffolding', source: 'nsw_highrisk_api' }, qld: { display_label: 'QBCC Scaffolding', source: 'qbcc_register' } },
  locksmith: { nsw: { display_label: 'NSW Security Licence (Locksmith)', source: 'nsw_security_api' }, qld: null },
  'asbestos-removal': { nsw: { display_label: 'NSW Asbestos Removal Licence', source: 'nsw_asbestos_api' }, qld: { display_label: 'QBCC Asbestos Removal', source: 'qbcc_register' } },
  // Unlicensed trades
  painter: { nsw: null, qld: null },
  tiler: { nsw: null, qld: null },
  landscaper: { nsw: null, qld: null },
  fencer: { nsw: null, qld: null },
  handyman: { nsw: null, qld: null },
  cleaner: { nsw: null, qld: null },
  plasterer: { nsw: null, qld: null },
  'cabinet-maker': { nsw: null, qld: null },
  flooring: { nsw: null, qld: null },
  'pest-control': { nsw: null, qld: null },
  'rubbish-removal': { nsw: null, qld: null },
};

export function getLicenceReq(trade: string, state: string) {
  const entry = TRADE_LICENCE_MAP[trade.toLowerCase()];
  if (!entry) return undefined;
  return entry[state.toLowerCase()] ?? undefined;
}
