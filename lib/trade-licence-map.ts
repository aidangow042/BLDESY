/**
 * Maps each BLDESY trade to its required licences per Australian state.
 * Used to determine which licence badge to display after verification.
 */

export type VerificationSource =
  | 'nsw_trades_api'
  | 'nsw_security_api'
  | 'nsw_asbestos_api'
  | 'nsw_design_api'
  | 'nsw_highrisk_api'
  | 'nsw_whitecard_api'
  | 'qbcc_register'
  | 'admin';

export interface LicenceRequirement {
  display_label: string;
  expected_categories: string[];
  source: VerificationSource;
}

export interface TradeLicenceEntry {
  nsw?: LicenceRequirement | null;
  qld?: LicenceRequirement | null;
}

/**
 * `null` means no licence required for that state.
 * Omitted state key means not yet mapped.
 */
export const TRADE_LICENCE_MAP: Record<string, TradeLicenceEntry> = {
  // Building & Construction
  builder: {
    nsw: { display_label: 'NSW Builder Licence', expected_categories: ['Contractor - Builder'], source: 'nsw_trades_api' },
    qld: { display_label: 'QBCC Builder', expected_categories: ['Builder'], source: 'qbcc_register' },
  },
  carpenter: {
    nsw: { display_label: 'NSW Carpentry Licence', expected_categories: ['Contractor - Carpenter', 'Tradesperson - Carpenter'], source: 'nsw_trades_api' },
    qld: { display_label: 'QBCC Carpentry', expected_categories: ['Carpentry'], source: 'qbcc_register' },
  },
  concreter: {
    nsw: { display_label: 'NSW Concreting Licence', expected_categories: ['Contractor - General Concretor'], source: 'nsw_trades_api' },
    qld: { display_label: 'QBCC Concreting', expected_categories: ['Concreting'], source: 'qbcc_register' },
  },
  bricklayer: {
    nsw: { display_label: 'NSW Bricklaying Licence', expected_categories: ['Contractor - Bricklayer'], source: 'nsw_trades_api' },
    qld: { display_label: 'QBCC Bricklaying', expected_categories: ['Bricklaying'], source: 'qbcc_register' },
  },
  demolition: {
    nsw: { display_label: 'NSW Demolition Licence', expected_categories: ['Demolition'], source: 'nsw_asbestos_api' },
    qld: { display_label: 'QBCC Demolition', expected_categories: ['Demolition'], source: 'qbcc_register' },
  },
  scaffolder: {
    nsw: { display_label: 'High Risk Work Licence - Scaffolding', expected_categories: ['Scaffolding'], source: 'nsw_highrisk_api' },
    qld: { display_label: 'QBCC Scaffolding', expected_categories: ['Scaffolding'], source: 'qbcc_register' },
  },
  // Electrical & Solar
  electrician: {
    nsw: { display_label: 'NSW Electrical Licence', expected_categories: ['Contractor - Electrical', 'Tradesperson - Electrician'], source: 'nsw_trades_api' },
    qld: { display_label: 'QBCC Electrical', expected_categories: ['Electrical'], source: 'qbcc_register' },
  },
  'solar-installer': {
    nsw: { display_label: 'NSW Electrical Licence', expected_categories: ['Contractor - Electrical'], source: 'nsw_trades_api' },
    qld: { display_label: 'QBCC Electrical', expected_categories: ['Electrical'], source: 'qbcc_register' },
  },
  'air-conditioning': {
    nsw: { display_label: 'NSW HVAC Licence', expected_categories: ['Contractor - Air Conditioning'], source: 'nsw_trades_api' },
    qld: { display_label: 'QBCC Mechanical', expected_categories: ['Mechanical Services'], source: 'qbcc_register' },
  },
  // Plumbing & Gas
  plumber: {
    nsw: { display_label: 'NSW Plumbing Licence', expected_categories: ['Contractor - Plumber', 'Tradesperson - Plumber'], source: 'nsw_trades_api' },
    qld: { display_label: 'QBCC Plumbing', expected_categories: ['Plumbing'], source: 'qbcc_register' },
  },
  'gas-fitter': {
    nsw: { display_label: 'NSW Gas Fitting Licence', expected_categories: ['Contractor - Gas Fitter'], source: 'nsw_trades_api' },
    qld: { display_label: 'QBCC Gas Fitting', expected_categories: ['Gas Fitting'], source: 'qbcc_register' },
  },
  // Outdoor & Landscaping
  landscaper: { nsw: null, qld: null },
  fencer: { nsw: null, qld: null },
  'pool-builder': {
    nsw: { display_label: 'NSW Swimming Pool Building Licence', expected_categories: ['Contractor - Swimming Pool Building'], source: 'nsw_trades_api' },
    qld: { display_label: 'QBCC Swimming Pool', expected_categories: ['Swimming Pool'], source: 'qbcc_register' },
  },
  // Interior & Finishing
  painter: { nsw: null, qld: null },
  tiler: { nsw: null, qld: null },
  plasterer: { nsw: null, qld: null },
  'cabinet-maker': { nsw: null, qld: null },
  flooring: { nsw: null, qld: null },
  glazier: {
    nsw: { display_label: 'NSW Glazier Licence', expected_categories: ['Contractor - Glazier'], source: 'nsw_trades_api' },
    qld: { display_label: 'QBCC Glazing', expected_categories: ['Glazing'], source: 'qbcc_register' },
  },
  // Roofing & Exterior
  roofer: {
    nsw: { display_label: 'NSW Roofing Licence', expected_categories: ['Contractor - Roofer'], source: 'nsw_trades_api' },
    qld: { display_label: 'QBCC Roofing', expected_categories: ['Roofing'], source: 'qbcc_register' },
  },
  waterproofer: {
    nsw: { display_label: 'NSW Waterproofing Licence', expected_categories: ['Contractor - Waterproofer'], source: 'nsw_trades_api' },
    qld: { display_label: 'QBCC Waterproofing', expected_categories: ['Waterproofing'], source: 'qbcc_register' },
  },
  // Specialist
  locksmith: {
    nsw: { display_label: 'NSW Security Licence (Locksmith)', expected_categories: ['Locksmith'], source: 'nsw_security_api' },
    qld: null,
  },
  'pest-control': { nsw: null, qld: null },
  'asbestos-removal': {
    nsw: { display_label: 'NSW Asbestos Removal Licence', expected_categories: ['Asbestos Removal'], source: 'nsw_asbestos_api' },
    qld: { display_label: 'QBCC Asbestos Removal', expected_categories: ['Asbestos Removal'], source: 'qbcc_register' },
  },
  // General unlicensed trades
  handyman: { nsw: null, qld: null },
  cleaner: { nsw: null, qld: null },
  'rubbish-removal': { nsw: null, qld: null },
};

export function getLicenceRequirement(
  trade: string,
  state: string,
): LicenceRequirement | null | undefined {
  const entry = TRADE_LICENCE_MAP[trade.toLowerCase()];
  if (!entry) return undefined;
  const stateKey = state.toLowerCase() as 'nsw' | 'qld';
  return entry[stateKey];
}

export function tradeRequiresLicence(trade: string, state: string): boolean {
  const req = getLicenceRequirement(trade, state);
  return req !== null && req !== undefined;
}
