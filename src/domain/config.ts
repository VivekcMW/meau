import type { Market, MarketKey, ModuleId, Persona } from './model';

export const markets: Record<MarketKey, Market> = {
  DK: { key: 'DK', country: 'Denmark', city: 'Copenhagen', currency: 'DKK', locale: 'da-DK', timezone: 'Europe/Copenhagen', tax: .25, invoice: 'Peppol', payment: 'MobilePay', lat: 55.676, lng: 12.568, places: ['Nørreport Station', 'Kongens Nytorv', 'Vesterbrogade', 'Fisketorvet', 'Frederiksberg', 'Islands Brygge', 'Østerport', 'City Hall Square'] },
  BR: { key: 'BR', country: 'Brazil', city: 'São Paulo', currency: 'BRL', locale: 'pt-BR', timezone: 'America/Sao_Paulo', tax: .05, invoice: 'NFS-e', payment: 'Pix', lat: -23.551, lng: -46.633, places: ['Avenida Paulista', 'Pinheiros', 'Vila Madalena', 'Ibirapuera', 'Oscar Freire', 'Faria Lima', 'Moema', 'Shopping Eldorado'] },
  US: { key: 'US', country: 'United States', city: 'New York', currency: 'USD', locale: 'en-US', timezone: 'America/New_York', tax: 0, invoice: 'Commercial invoice', payment: 'ACH', lat: 40.713, lng: -74.006, places: ['Times Square', 'SoHo', 'Union Square', 'Brooklyn Bridge', 'Hudson Yards', 'Grand Central', 'Chelsea', 'Flatiron'] },
  AU: { key: 'AU', country: 'Australia', city: 'Sydney', currency: 'AUD', locale: 'en-AU', timezone: 'Australia/Sydney', tax: .1, invoice: 'Peppol', payment: 'PayID', lat: -33.868, lng: 151.209, places: ['Circular Quay', 'Darling Harbour', 'Martin Place', 'Bondi Junction', 'Central Station', 'Pitt Street', 'Surry Hills', 'Barangaroo'] },
  IT: { key: 'IT', country: 'Italy', city: 'Milan', currency: 'EUR', locale: 'it-IT', timezone: 'Europe/Rome', tax: .22, invoice: 'FatturaPA', payment: 'SEPA', lat: 45.464, lng: 9.19, places: ['Piazza del Duomo', 'Porta Nuova', 'Navigli', 'Centrale', 'Brera', 'Corso Como', 'CityLife', 'Porta Venezia'] },
  UA: { key: 'UA', country: 'Ukraine', city: 'Kyiv', currency: 'UAH', locale: 'uk-UA', timezone: 'Europe/Kyiv', tax: .2, invoice: 'Demo invoice', payment: 'Bank transfer', lat: 50.45, lng: 30.523, places: ['Khreshchatyk', 'Podil', 'Pechersk', 'Golden Gate', 'Obolon', 'Arsenalna', 'Lybidska', 'Olympiiska'] },
};
export const moduleNames: Record<ModuleId, string> = {
  home: 'Overview', planner: 'Planner', deals: 'Direct deals', campaigns: 'Campaigns', inventory: 'Explore inventory', marketplace: 'Marketplace',
  measure: 'Measure', creative: 'Creative studio', schedule: 'Ad server', field: 'Field operations', ssp: 'Supply & yield',
  dsp: 'Trading desk', reports: 'Reports & proof', finance: 'Finance', attribution: 'Attribution', data: 'Audience studio',
  agents: 'Agent hub', admin: 'Workspace settings', developer: 'Developer portal', tasks: 'My tasks',
};
export const personas: Persona[] = [
  { id: 'planner', name: 'Sofia', role: 'Agency planner', initials: 'SL', tenant: 'Northstar Agency', home: 'home', nav: ['home', 'planner', 'deals', 'campaigns', 'inventory', 'reports', 'data', 'marketplace', 'attribution', 'measure'] },
  { id: 'sales', name: 'Daniel', role: 'Owner sales', initials: 'DM', tenant: 'Urban Reach Media', home: 'campaigns', nav: ['home', 'deals', 'campaigns', 'inventory', 'reports', 'marketplace'] },
  { id: 'ops', name: 'Tom', role: 'Inventory & operations', initials: 'TW', tenant: 'Urban Reach Media', home: 'schedule', nav: ['home', 'schedule', 'field', 'inventory', 'creative', 'campaigns', 'measure'] },
  { id: 'trader', name: 'Marcus', role: 'Agency trader', initials: 'MJ', tenant: 'Northstar Agency', home: 'dsp', nav: ['home', 'dsp', 'campaigns', 'inventory', 'data', 'reports'] },
  { id: 'finance', name: 'Ana', role: 'Finance manager', initials: 'AC', tenant: 'Urban Reach Media', home: 'finance', nav: ['home', 'finance', 'campaigns', 'reports'] },
  { id: 'advertiser', name: 'Rafael', role: 'Business owner', initials: 'RS', tenant: 'Pão & Co.', home: 'marketplace', nav: ['home', 'marketplace', 'campaigns', 'creative', 'reports'] },
  { id: 'admin', name: 'Kristina', role: 'Platform admin', initials: 'KN', tenant: 'AllUnite', home: 'admin', nav: ['home', 'admin', 'agents', 'inventory', 'measure', 'developer', 'campaigns', 'finance', 'reports', 'planner', 'deals', 'marketplace', 'creative', 'schedule', 'field', 'ssp', 'dsp', 'attribution', 'data'] },
  { id: 'brand', name: 'Aiko', role: 'Brand marketer', initials: 'AT', tenant: 'Nord Collective', home: 'reports', nav: ['home', 'deals', 'campaigns', 'reports', 'attribution', 'data', 'measure'] },
  { id: 'crew', name: 'João', role: 'Field crew', initials: 'JP', tenant: 'Urban Reach Media', home: 'field', nav: ['home', 'field', 'campaigns'] },
  { id: 'approver', name: 'Helena', role: 'Budget approver', initials: 'HL', tenant: 'Northstar Agency', home: 'tasks', nav: ['home', 'tasks', 'deals', 'campaigns', 'reports'] },
  { id: 'reviewer', name: 'Ben', role: 'Creative reviewer', initials: 'BC', tenant: 'Urban Reach Media', home: 'creative', nav: ['home', 'creative', 'campaigns'] },
  { id: 'yield', name: 'Priya', role: 'Yield manager', initials: 'PK', tenant: 'Urban Reach Media', home: 'ssp', nav: ['home', 'ssp', 'inventory', 'campaigns', 'reports'] },
  { id: 'executive', name: 'Lars', role: 'Owner executive', initials: 'LN', tenant: 'Urban Reach Media', home: 'measure', nav: ['home', 'measure', 'reports', 'campaigns', 'inventory'] },
  { id: 'auditor', name: 'Elin', role: 'Measurement auditor', initials: 'EL', tenant: 'Industry Council', home: 'measure', nav: ['home', 'measure', 'reports'] },
  { id: 'developer', name: 'Oleh', role: 'Integration partner', initials: 'OK', tenant: 'Partner workspace', home: 'developer', nav: ['home', 'developer', 'measure'] },
];
export interface Agreement { id: string; buyer: string; owner: string; name: string; discount: number }
// Static stand-ins for negotiated annual or volume rates between a buyer tenant and a media owner.
export const agreements: readonly Agreement[] = [
  { id: 'AGR-NS-URM', buyer: 'Northstar Agency', owner: 'Urban Reach Media', name: 'Northstar 2026 annual rates', discount: .08 },
  { id: 'AGR-NS-VO', buyer: 'Northstar Agency', owner: 'Vista Outdoor', name: 'Volume tier 2', discount: .05 },
  { id: 'AGR-NC-VO', buyer: 'Nord Collective', owner: 'Vista Outdoor', name: 'Nord Collective direct rates', discount: .06 },
];
export const findAgreement = (buyer: string, owner: string) => agreements.find(a => a.buyer === buyer && a.owner === owner);
export const agreementById = (id?: string) => agreements.find(a => a.id === id);
export function getPersona(id: string) {
  const persona = personas.find(p => p.id === id);
  if (!persona) throw new Error('Unknown workspace persona.');
  return persona;
}
export const compact = (n: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
export const money = (minor: number, market: MarketKey, compactValue = false) => new Intl.NumberFormat(markets[market].locale, {
  style: 'currency', currency: markets[market].currency, maximumFractionDigits: 0, notation: compactValue ? 'compact' : 'standard',
}).format(minor / 100);
export const dateLabel = (date: string, market: MarketKey = 'DK') => new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', timeZone: markets[market].timezone,
}).format(new Date(date));
export const demoStart = '2026-11-02T08:00:00.000Z';
export const demoEnd = '2026-11-16T08:00:00.000Z';
