export const baseRoles = [
  'propietario',
  'administrador',
  'contador',
  'vendedor',
  'comprador',
  'almacenista',
  'cajero',
  'rh',
  'solo_lectura'
] as const;

export const currencies = ['MXN', 'USD', 'EUR'] as const;

export const fiscalRegimes = {
  general: '601',
  nonProfit: '603',
  salaries: '605',
  leasing: '606',
  assetSales: '607',
  otherIncome: '608',
  consolidation: '609',
  foreignResidents: '610',
  dividends: '611',
  professionals: '612',
  interest: '614',
  prizes: '615',
  noTaxObligations: '616',
  productionCooperatives: '620',
  taxIncorporation: '621',
  agricultural: '622',
  optionalGroup: '623',
  coordinated: '624',
  digitalPlatforms: '625',
  simplifiedTrust: '626'
} as const;

export type BaseRole = (typeof baseRoles)[number];
