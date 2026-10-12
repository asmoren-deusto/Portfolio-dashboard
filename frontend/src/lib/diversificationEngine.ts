/**
 * Diversification Engine — Quantitative models, World Market Cap Benchmarks (MSCI ACWI / MSCI World),
 * sector taxonomies, currency exposure, and portfolio health scoring.
 */
import type { Position } from '@/lib/mockData'

// ── Official World Market Capitalization Benchmark (MSCI ACWI Reference) ───────
export interface GeographicRegion {
  id: string
  name: string
  shortName: string
  flag: string
  worldWeight: number // Official World Market Cap weight in % (MSCI ACWI)
  color: string
  description: string
}

export const WORLD_GEO_BENCHMARK: GeographicRegion[] = [
  {
    id: 'north_america',
    name: 'Norteamérica (EE.UU. & Canadá)',
    shortName: 'Norteamérica',
    flag: '🇺🇸',
    worldWeight: 63.8,
    color: '#3b82f6', // Blue
    description: 'Mayor mercado de capitales global (S&P 500, Nasdaq 100, TSX).',
  },
  {
    id: 'europe',
    name: 'Europa Desarrollada',
    shortName: 'Europa',
    flag: '🇪🇺',
    worldWeight: 15.4,
    color: '#10b981', // Emerald
    description: 'Eurozona, Reino Unido, Suiza y países nórdicos (Euro Stoxx 50, DAX, FTSE).',
  },
  {
    id: 'emerging',
    name: 'Mercados Emergentes',
    shortName: 'Emergentes',
    flag: '🌏',
    worldWeight: 10.2,
    color: '#f59e0b', // Amber
    description: 'China, India, Taiwán, Corea del Sur, Brasil y economías en rápida expansión.',
  },
  {
    id: 'japan',
    name: 'Japón',
    shortName: 'Japón',
    flag: '🇯🇵',
    worldWeight: 5.4,
    color: '#ec4899', // Pink
    description: 'Segunda mayor economía desarrollada (Nikkei 225, TOPIX).',
  },
  {
    id: 'pacific',
    name: 'Asia-Pacífico Desarrollada',
    shortName: 'Pacífico',
    flag: '🇦🇺',
    worldWeight: 2.6,
    color: '#8b5cf6', // Violet
    description: 'Australia, Hong Kong, Singapur y Nueva Zelanda.',
  },
  {
    id: 'other',
    name: 'Otros / Monetario / Liquidez',
    shortName: 'Otros / Caja',
    flag: '🌐',
    worldWeight: 2.6,
    color: '#64748b', // Slate
    description: 'Oriente Medio, África, efectivo y reservas no clasificadas.',
  },
]

// ── Official Global Sector Benchmark (MSCI World Sector Weights) ──────────────
export interface SectorDefinition {
  id: string
  name: string
  iconName: string
  worldWeight: number // MSCI World Sector Weight in %
  color: string
}

export const WORLD_SECTOR_BENCHMARK: SectorDefinition[] = [
  { id: 'tech', name: 'Tecnología de la Información', iconName: 'Cpu', worldWeight: 25.2, color: '#3b82f6' },
  { id: 'financials', name: 'Servicios Financieros', iconName: 'Landmark', worldWeight: 15.1, color: '#10b981' },
  { id: 'health', name: 'Salud y Farmacia', iconName: 'HeartPulse', worldWeight: 11.6, color: '#ec4899' },
  { id: 'industrials', name: 'Industrial & Transporte', iconName: 'Factory', worldWeight: 10.9, color: '#f59e0b' },
  { id: 'consumer_disc', name: 'Consumo Discrecional', iconName: 'ShoppingBag', worldWeight: 10.2, color: '#8b5cf6' },
  { id: 'comms', name: 'Servicios de Comunicación', iconName: 'Radio', worldWeight: 7.5, color: '#06b6d4' },
  { id: 'consumer_stap', name: 'Consumo Básico / Defensivo', iconName: 'Apple', worldWeight: 6.4, color: '#84cc16' },
  { id: 'energy', name: 'Energía y Petróleo', iconName: 'Flame', worldWeight: 4.3, color: '#ef4444' },
  { id: 'materials', name: 'Materiales Básicos & Minería', iconName: 'Pickaxe', worldWeight: 3.7, color: '#d97706' },
  { id: 'utilities', name: 'Utilities & Inmobiliario', iconName: 'Lightbulb', worldWeight: 5.1, color: '#64748b' },
]

// ── Asset Taxonomy Registry ───────────────────────────────────────────────────
interface AssetTaxonomy {
  geo: Record<string, number>
  sectors: Record<string, number>
  assetClass: 'equity' | 'fixed_income' | 'cash' | 'commodity' | 'crypto'
  currencies: Record<string, number>
}

// Known funds/holdings breakdown mapping (Institutional Morningstar / Factsheet data)
const ASSET_REGISTRY: Record<string, AssetTaxonomy> = {
  // Fidelity MSCI World Index Fund EUR P Acc (IE00BYX5NX33)
  IE00BYX5NX33: {
    geo: { north_america: 0.71, europe: 0.18, japan: 0.058, pacific: 0.027, emerging: 0.0, other: 0.025 },
    sectors: { tech: 0.252, financials: 0.151, health: 0.116, industrials: 0.109, consumer_disc: 0.102, comms: 0.075, consumer_stap: 0.064, energy: 0.043, materials: 0.037, utilities: 0.051 },
    assetClass: 'equity',
    currencies: { USD: 0.71, EUR: 0.18, JPY: 0.06, Other: 0.05 },
  },
  // iShares Developed World Index (IE000ZYRH0Q7)
  IE000ZYRH0Q7: {
    geo: { north_america: 0.71, europe: 0.18, japan: 0.058, pacific: 0.027, emerging: 0.0, other: 0.025 },
    sectors: { tech: 0.252, financials: 0.151, health: 0.116, industrials: 0.109, consumer_disc: 0.102, comms: 0.075, consumer_stap: 0.064, energy: 0.043, materials: 0.037, utilities: 0.051 },
    assetClass: 'equity',
    currencies: { USD: 0.71, EUR: 0.18, JPY: 0.06, Other: 0.05 },
  },
  // DNB Fund - Technology (LU0302296495)
  LU0302296495: {
    geo: { north_america: 0.84, europe: 0.12, japan: 0.02, pacific: 0.01, emerging: 0.01, other: 0.0 },
    sectors: { tech: 0.88, comms: 0.10, consumer_disc: 0.02 },
    assetClass: 'equity',
    currencies: { USD: 0.84, EUR: 0.12, Other: 0.04 },
  },
  // Polar Capital Global Technology (IE00BM95B621)
  IE00BM95B621: {
    geo: { north_america: 0.85, europe: 0.10, japan: 0.02, pacific: 0.01, emerging: 0.02, other: 0.0 },
    sectors: { tech: 0.90, comms: 0.08, consumer_disc: 0.02 },
    assetClass: 'equity',
    currencies: { USD: 0.85, EUR: 0.10, Other: 0.05 },
  },
  // Azvalor Internacional FI (ES0112611001)
  ES0112611001: {
    geo: { europe: 0.44, north_america: 0.32, emerging: 0.18, japan: 0.0, pacific: 0.02, other: 0.04 },
    sectors: { energy: 0.52, materials: 0.24, industrials: 0.14, consumer_disc: 0.06, other: 0.04 },
    assetClass: 'equity',
    currencies: { EUR: 0.44, USD: 0.32, Other: 0.24 },
  },
  // iShares Emerging Markets Index (IE00QAZP7L2)
  IE00QAZP7L2: {
    geo: { emerging: 1.0, north_america: 0.0, europe: 0.0, japan: 0.0, pacific: 0.0, other: 0.0 },
    sectors: { tech: 0.23, financials: 0.22, consumer_disc: 0.13, comms: 0.09, materials: 0.08, industrials: 0.07, consumer_stap: 0.06, health: 0.04, energy: 0.04, utilities: 0.04 },
    assetClass: 'equity',
    currencies: { USD: 0.25, Other: 0.75 },
  },
  // Fidelity MSCI Emerging Markets Index (IE00BYX5M476)
  IE00BYX5M476: {
    geo: { emerging: 1.0, north_america: 0.0, europe: 0.0, japan: 0.0, pacific: 0.0, other: 0.0 },
    sectors: { tech: 0.23, financials: 0.22, consumer_disc: 0.13, comms: 0.09, materials: 0.08, industrials: 0.07, consumer_stap: 0.06, health: 0.04, energy: 0.04, utilities: 0.04 },
    assetClass: 'equity',
    currencies: { USD: 0.25, Other: 0.75 },
  },
  // Fidelity MSCI Japan Index Fund (IE00BYX5NH74)
  IE00BYX5NH74: {
    geo: { japan: 1.0, north_america: 0.0, europe: 0.0, emerging: 0.0, pacific: 0.0, other: 0.0 },
    sectors: { industrials: 0.22, consumer_disc: 0.19, tech: 0.15, financials: 0.13, health: 0.09, comms: 0.07, consumer_stap: 0.06, materials: 0.05, utilities: 0.04 },
    assetClass: 'equity',
    currencies: { JPY: 1.0 },
  },
  // Fidelity Euro 50 Index Fund (LU0261952682)
  LU0261952682: {
    geo: { europe: 1.0, north_america: 0.0, japan: 0.0, emerging: 0.0, pacific: 0.0, other: 0.0 },
    sectors: { financials: 0.21, industrials: 0.19, tech: 0.15, consumer_disc: 0.14, health: 0.08, consumer_stap: 0.07, energy: 0.06, materials: 0.05, utilities: 0.05 },
    assetClass: 'equity',
    currencies: { EUR: 1.0 },
  },
  // Carmignac Portfolio Credit (LU1623762843)
  LU1623762843: {
    geo: { europe: 0.75, north_america: 0.20, other: 0.05 },
    sectors: { financials: 0.40, industrials: 0.30, comms: 0.15, energy: 0.10, other: 0.05 },
    assetClass: 'fixed_income',
    currencies: { EUR: 0.85, USD: 0.15 },
  },
  // Robeco Smart Energy D EUR (LU2145461757)
  LU2145461757: {
    geo: { north_america: 0.62, europe: 0.30, pacific: 0.05, emerging: 0.03 },
    sectors: { tech: 0.46, industrials: 0.32, utilities: 0.22 },
    assetClass: 'equity',
    currencies: { USD: 0.65, EUR: 0.30, Other: 0.05 },
  },
}

/**
 * Intelligent heuristic fallback for any arbitrary position or stock
 */
function resolveAssetTaxonomy(pos: Position): AssetTaxonomy {
  const isin = pos.isin?.toUpperCase() || ''
  if (ASSET_REGISTRY[isin]) {
    return ASSET_REGISTRY[isin]
  }

  const name = (pos.name || '').toLowerCase()
  const isinPrefix = isin.slice(0, 2)
  const assetType = pos.asset_type || 'fund'

  // Indexa fund / EPSV Global Equity
  if (name.includes('indexa') || name.includes('epsv')) {
    return {
      geo: { north_america: 0.62, europe: 0.18, emerging: 0.10, japan: 0.06, pacific: 0.04 },
      sectors: { tech: 0.24, financials: 0.16, health: 0.12, industrials: 0.11, consumer_disc: 0.10, comms: 0.08, consumer_stap: 0.06, energy: 0.05, materials: 0.04, utilities: 0.04 },
      assetClass: 'equity',
      currencies: { USD: 0.62, EUR: 0.18, Other: 0.20 },
    }
  }

  // Cash / Money Market
  if (name.includes('trésorerie') || name.includes('monetario') || name.includes('liquidez') || isin.startsWith('TR_') || assetType === 'cash') {
    return {
      geo: { europe: 1.0 },
      sectors: { financials: 1.0 },
      assetClass: 'cash',
      currencies: { EUR: 1.0 },
    }
  }

  // Fixed Income / Bonds
  if (name.includes('bono') || name.includes('bond') || name.includes('credit') || name.includes('fixed') || assetType === 'bond') {
    return {
      geo: { europe: 0.65, north_america: 0.30, other: 0.05 },
      sectors: { financials: 0.50, utilities: 0.30, industrials: 0.20 },
      assetClass: 'fixed_income',
      currencies: { EUR: 0.70, USD: 0.30 },
    }
  }

  // Crypto
  if (assetType === 'crypto' || name.includes('bitcoin') || name.includes('ethereum')) {
    return {
      geo: { other: 1.0 },
      sectors: { tech: 1.0 },
      assetClass: 'crypto',
      currencies: { USD: 1.0 },
    }
  }

  // Global / World Funds
  if (name.includes('world') || name.includes('global') || name.includes('acwi') || name.includes('desarrollad')) {
    return {
      geo: { north_america: 0.70, europe: 0.18, japan: 0.06, pacific: 0.03, other: 0.03 },
      sectors: { tech: 0.25, financials: 0.15, health: 0.12, industrials: 0.11, consumer_disc: 0.10, comms: 0.08, consumer_stap: 0.06, energy: 0.04, materials: 0.04, utilities: 0.05 },
      assetClass: 'equity',
      currencies: { USD: 0.70, EUR: 0.18, JPY: 0.06, Other: 0.06 },
    }
  }

  // Emerging Markets
  if (name.includes('emerg') || name.includes('china') || name.includes('india') || name.includes('asia')) {
    return {
      geo: { emerging: 1.0 },
      sectors: { tech: 0.24, financials: 0.22, consumer_disc: 0.14, comms: 0.10, materials: 0.08, industrials: 0.08, other: 0.14 },
      assetClass: 'equity',
      currencies: { USD: 0.30, Other: 0.70 },
    }
  }

  // Japan
  if (name.includes('japan') || name.includes('japón') || name.includes('nikkei')) {
    return {
      geo: { japan: 1.0 },
      sectors: { industrials: 0.22, consumer_disc: 0.19, tech: 0.15, financials: 0.13, health: 0.09, other: 0.22 },
      assetClass: 'equity',
      currencies: { JPY: 1.0 },
    }
  }

  // European Funds or Spanish Stocks
  if (name.includes('euro') || name.includes('ibex') || isinPrefix === 'ES') {
    return {
      geo: { europe: 1.0 },
      sectors: { financials: 0.28, utilities: 0.18, industrials: 0.18, consumer_disc: 0.14, comms: 0.08, materials: 0.07, tech: 0.07 },
      assetClass: 'equity',
      currencies: { EUR: 1.0 },
    }
  }

  // US Stocks / Funds
  if (name.includes('s&p') || name.includes('nasdaq') || name.includes('ee.uu') || name.includes('america') || isinPrefix === 'US') {
    return {
      geo: { north_america: 1.0 },
      sectors: { tech: 0.32, financials: 0.13, health: 0.12, consumer_disc: 0.11, comms: 0.09, industrials: 0.08, consumer_stap: 0.06, energy: 0.04, materials: 0.02, utilities: 0.03 },
      assetClass: 'equity',
      currencies: { USD: 1.0 },
    }
  }

  // Generic fallback based on ISIN country code
  const isEurope = ['LU', 'IE', 'FR', 'DE', 'IT', 'NL', 'GB'].includes(isinPrefix)
  return {
    geo: isEurope ? { north_america: 0.60, europe: 0.30, other: 0.10 } : { other: 1.0 },
    sectors: { tech: 0.20, financials: 0.20, health: 0.15, industrials: 0.15, consumer_disc: 0.15, other: 0.15 },
    assetClass: 'equity',
    currencies: { EUR: 0.50, USD: 0.50 },
  }
}

// ── Computed Diversification Results Types ────────────────────────────────────

export interface GeographicComparisonItem {
  region: GeographicRegion
  portfolioWeight: number   // % in user portfolio
  portfolioValue: number    // € in user portfolio
  worldWeight: number       // % in MSCI ACWI benchmark
  delta: number             // portfolioWeight - worldWeight
  status: 'overweight' | 'underweight' | 'aligned'
  statusLabel: string
  statusColor: string
}

export interface SectorComparisonItem {
  sector: SectorDefinition
  portfolioWeight: number
  portfolioValue: number
  worldWeight: number
  delta: number
  status: 'overweight' | 'underweight' | 'aligned'
}

export interface SuperSectorItem {
  id: 'defensive' | 'cyclical' | 'sensitive'
  name: string
  description: string
  portfolioWeight: number
  portfolioValue: number
  worldWeight: number
  delta: number
  color: string
  sectorNames: string[]
}

export interface CurrencyItem {
  code: string
  name: string
  flag: string
  weight: number
  value: number
  riskType: 'Local (Sin Riesgo Divisa)' | 'Riesgo Dólar (USD)' | 'Multidivisa Global'
}

export interface FxSensitivityScenario {
  label: string
  rateChangePct: number // +10, +5, -5, -10
  portfolioEuroImpact: number // in €
  portfolioPctImpact: number // in %
  isPositive: boolean
}

export interface AssetClassItem {
  id: string
  name: string
  weight: number
  value: number
  color: string
  roleDescription: string
}

export interface InferredRiskProfile {
  name: string
  tagline: string
  equityRatio: number
  fixedIncomeRatio: number
  cashRatio: number
  recommendedHorizon: string
  expectedVolatilityPct: number
  historicalMaxDrawdownPct: number
  expectedRealReturnPct: number
  dryPowderAmount: number
  dryPowderPct: number
}

export interface RebalanceBandItem {
  regionId: string
  regionName: string
  flag: string
  currentWeight: number
  targetWeight: number
  currentValue: number
  lowerBand: number
  upperBand: number
  inBand: boolean
  deviationAbs: number
  deviationRel: number
  urgency: 'optimal' | 'warning' | 'critical'
}

export interface CashFlowRebalanceItem {
  regionId: string
  regionName: string
  flag: string
  suggestedCashAmount: number
  suggestedCashShare: number
  currentWeight: number
  projectedWeight: number
  targetWeight: number
}

export interface DiversificationDiagnosis {
  score: number // 0 to 100
  scoreLabel: string
  scoreColor: string
  verdictTitle: string
  verdictParagraphs: string[]
  topRegion: GeographicComparisonItem
  homeBiasPct: number // % in Europe vs 15.4%
  usExposurePct: number
  emergingGapPct: number
  rebalanceSuggestions: Array<{
    action: 'increase' | 'decrease' | 'maintain'
    title: string
    description: string
    targetRegion: string
  }>
  geographicBreakdown: GeographicComparisonItem[]
  sectorBreakdown: SectorComparisonItem[]
  superSectors: SuperSectorItem[]
  sectorHhi: number
  top3SectorsWeight: number
  currencyBreakdown: CurrencyItem[]
  fxSensitivity: FxSensitivityScenario[]
  assetClassBreakdown: AssetClassItem[]
  inferredProfile: InferredRiskProfile
  rebalanceBands: RebalanceBandItem[]
  totalPortfolioValue: number
}

// ── Core Engine Function ──────────────────────────────────────────────────────

export function analyzePortfolioDiversification(positions: Position[]): DiversificationDiagnosis {
  const validPositions = positions.filter((p) => (p.current_value || 0) > 0.01)
  const totalValue = validPositions.reduce((acc, p) => acc + (p.current_value || 0), 0)

  // Empty fallback
  if (totalValue <= 0 || validPositions.length === 0) {
    return {
      score: 0,
      scoreLabel: 'Sin datos',
      scoreColor: '#94a3b8',
      verdictTitle: 'Cartera vacía o sin valoración activa',
      verdictParagraphs: ['Registra tus primeras operaciones para desbloquear el diagnóstico mundial.'],
      topRegion: {
        region: WORLD_GEO_BENCHMARK[0],
        portfolioWeight: 0,
        portfolioValue: 0,
        worldWeight: 63.8,
        delta: -63.8,
        status: 'underweight',
        statusLabel: 'Sin datos',
        statusColor: '#94a3b8',
      },
      homeBiasPct: 0,
      usExposurePct: 0,
      emergingGapPct: 0,
      rebalanceSuggestions: [],
      geographicBreakdown: [],
      sectorBreakdown: [],
      superSectors: [],
      sectorHhi: 0,
      top3SectorsWeight: 0,
      currencyBreakdown: [],
      fxSensitivity: [],
      assetClassBreakdown: [],
      inferredProfile: {
        name: 'Sin datos',
        tagline: 'Sin activos asignados',
        equityRatio: 0,
        fixedIncomeRatio: 0,
        cashRatio: 0,
        recommendedHorizon: 'N/A',
        expectedVolatilityPct: 0,
        historicalMaxDrawdownPct: 0,
        expectedRealReturnPct: 0,
        dryPowderAmount: 0,
        dryPowderPct: 0,
      },
      rebalanceBands: [],
      totalPortfolioValue: 0,
    }
  }

  // 1. Accumulate weights
  const geoValues: Record<string, number> = {}
  const sectorValues: Record<string, number> = {}
  const currencyValues: Record<string, number> = {}
  const assetClassValues: Record<string, number> = {}

  for (const pos of validPositions) {
    const pVal = pos.current_value || 0
    const tax = resolveAssetTaxonomy(pos)

    // Geo
    for (const [rId, rShare] of Object.entries(tax.geo)) {
      geoValues[rId] = (geoValues[rId] || 0) + pVal * rShare
    }
    // Sectors
    for (const [sId, sShare] of Object.entries(tax.sectors)) {
      sectorValues[sId] = (sectorValues[sId] || 0) + pVal * sShare
    }
    // Currency
    for (const [cId, cShare] of Object.entries(tax.currencies)) {
      currencyValues[cId] = (currencyValues[cId] || 0) + pVal * cShare
    }
    // Asset class
    assetClassValues[tax.assetClass] = (assetClassValues[tax.assetClass] || 0) + pVal
  }

  // 2. Build Geographic Comparison
  const geographicBreakdown: GeographicComparisonItem[] = WORLD_GEO_BENCHMARK.map((reg) => {
    const val = geoValues[reg.id] || 0
    const pWeight = (val / totalValue) * 100
    const delta = pWeight - reg.worldWeight

    let status: 'overweight' | 'underweight' | 'aligned' = 'aligned'
    let statusLabel = 'Alineado con el Mundo'
    let statusColor = '#10b981' // Emerald

    if (delta > 4.0) {
      status = 'overweight'
      statusLabel = `Sobreponderado (+${delta.toFixed(1)}%)`
      statusColor = '#3b82f6' // Blue
    } else if (delta < -4.0) {
      status = 'underweight'
      statusLabel = `Infraponderado (${delta.toFixed(1)}%)`
      statusColor = '#f59e0b' // Amber
    }

    return {
      region: reg,
      portfolioWeight: pWeight,
      portfolioValue: val,
      worldWeight: reg.worldWeight,
      delta,
      status,
      statusLabel,
      statusColor,
    }
  }).sort((a, b) => b.portfolioWeight - a.portfolioWeight)

  // 3. Build Sector Comparison & Macro Super-Sectors
  const sectorBreakdown: SectorComparisonItem[] = WORLD_SECTOR_BENCHMARK.map((sec) => {
    const val = sectorValues[sec.id] || 0
    const pWeight = (val / totalValue) * 100
    const delta = pWeight - sec.worldWeight

    let status: 'overweight' | 'underweight' | 'aligned' = 'aligned'
    if (delta > 3.5) status = 'overweight'
    else if (delta < -3.5) status = 'underweight'

    return {
      sector: sec,
      portfolioWeight: pWeight,
      portfolioValue: val,
      worldWeight: sec.worldWeight,
      delta,
      status,
    }
  }).sort((a, b) => b.portfolioWeight - a.portfolioWeight)

  // Super-Sectors definition (Morningstar Macro Taxonomy)
  // - Defensive (Health, Consumer Staples, Utilities) -> 23.1% world
  // - Cyclical (Financials, Consumer Discretionary, Materials) -> 29.0% world
  // - Sensitive (Technology, Communication, Industrials, Energy) -> 47.9% world
  const defensiveSectorIds = ['health', 'consumer_stap', 'utilities']
  const cyclicalSectorIds = ['financials', 'consumer_disc', 'materials']
  const sensitiveSectorIds = ['tech', 'comms', 'industrials', 'energy']

  const getSuperSectorStats = (ids: string[]) => {
    const val = ids.reduce((acc, id) => acc + (sectorValues[id] || 0), 0)
    const pWeight = (val / totalValue) * 100
    const wWeight = ids.reduce((acc, id) => {
      const sec = WORLD_SECTOR_BENCHMARK.find((s) => s.id === id)
      return acc + (sec?.worldWeight || 0)
    }, 0)
    return { val, pWeight, wWeight, delta: pWeight - wWeight }
  }

  const defStats = getSuperSectorStats(defensiveSectorIds)
  const cycStats = getSuperSectorStats(cyclicalSectorIds)
  const senStats = getSuperSectorStats(sensitiveSectorIds)

  const superSectors: SuperSectorItem[] = [
    {
      id: 'sensitive',
      name: 'Super-Sector Sensible (Tecnología & Capital)',
      description: 'Sensible a tipos de interés, digitalización y capex corporativo.',
      portfolioWeight: senStats.pWeight,
      portfolioValue: senStats.val,
      worldWeight: senStats.wWeight,
      delta: senStats.delta,
      color: '#3b82f6',
      sectorNames: ['Tecnología', 'Comunicaciones', 'Industrial', 'Energía'],
    },
    {
      id: 'cyclical',
      name: 'Super-Sector Cíclico (Expansión del PIB)',
      description: 'Alineado con el crecimiento económico global, consumo y crédito.',
      portfolioWeight: cycStats.pWeight,
      portfolioValue: cycStats.val,
      worldWeight: cycStats.wWeight,
      delta: cycStats.delta,
      color: '#10b981',
      sectorNames: ['Finanzas', 'Consumo Discrecional', 'Materiales'],
    },
    {
      id: 'defensive',
      name: 'Super-Sector Defensivo (Resistencia Macro)',
      description: 'Baja beta frente al ciclo económico, demanda inelástica en recesión.',
      portfolioWeight: defStats.pWeight,
      portfolioValue: defStats.val,
      worldWeight: defStats.wWeight,
      delta: defStats.delta,
      color: '#ec4899',
      sectorNames: ['Salud', 'Consumo Básico', 'Utilities'],
    },
  ]

  // Sector Concentration metrics
  const sectorHhi = Math.round(sectorBreakdown.reduce((acc, s) => acc + Math.pow(s.portfolioWeight, 2), 0))
  const top3SectorsWeight = sectorBreakdown.slice(0, 3).reduce((acc, s) => acc + s.portfolioWeight, 0)

  // 4. Build Currency Breakdown & FX Sensitivity Scenarios
  const CURRENCY_META: Record<string, { name: string; flag: string; risk: CurrencyItem['riskType'] }> = {
    EUR: { name: 'Euro (Moneda Local)', flag: '🇪🇺', risk: 'Local (Sin Riesgo Divisa)' },
    USD: { name: 'Dólar Estadounidense', flag: '🇺🇸', risk: 'Riesgo Dólar (USD)' },
    JPY: { name: 'Yen Japonés', flag: '🇯🇵', risk: 'Multidivisa Global' },
    Other: { name: 'Divisas Globales & Emergentes', flag: '🌐', risk: 'Multidivisa Global' },
  }

  const currencyBreakdown: CurrencyItem[] = Object.entries(currencyValues).map(([code, val]) => {
    const meta = CURRENCY_META[code] || { name: code, flag: '🌐', risk: 'Multidivisa Global' }
    return {
      code,
      name: meta.name,
      flag: meta.flag,
      weight: (val / totalValue) * 100,
      value: val,
      riskType: meta.risk,
    }
  }).sort((a, b) => b.weight - a.weight)

  // FX Scenarios (+10%, +5%, -5%, -10% on USD)
  const usdValue = currencyValues['USD'] || 0
  const fxSensitivity: FxSensitivityScenario[] = [
    {
      label: '+10% Rally del Dólar (USD Fuerte)',
      rateChangePct: 10,
      portfolioEuroImpact: usdValue * 0.10,
      portfolioPctImpact: (usdValue * 0.10 / totalValue) * 100,
      isPositive: true,
    },
    {
      label: '+5% Apreciación moderada del USD',
      rateChangePct: 5,
      portfolioEuroImpact: usdValue * 0.05,
      portfolioPctImpact: (usdValue * 0.05 / totalValue) * 100,
      isPositive: true,
    },
    {
      label: '-5% Apreciación del Euro vs USD',
      rateChangePct: -5,
      portfolioEuroImpact: -usdValue * 0.05,
      portfolioPctImpact: (-usdValue * 0.05 / totalValue) * 100,
      isPositive: false,
    },
    {
      label: '-10% Caída pronunciada del USD',
      rateChangePct: -10,
      portfolioEuroImpact: -usdValue * 0.10,
      portfolioPctImpact: (-usdValue * 0.10 / totalValue) * 100,
      isPositive: false,
    },
  ]

  // 5. Build Asset Class Breakdown & Inferred Risk Profile
  const ASSET_CLASS_META: Record<string, { name: string; color: string; role: string }> = {
    equity: {
      name: 'Renta Variable Global',
      color: '#3b82f6',
      role: 'Motor principal de rentabilidad y apreciación de capital a largo plazo.',
    },
    fixed_income: {
      name: 'Renta Fija / Crédito',
      color: '#10b981',
      role: 'Amortiguador de volatilidad y flujos periódicos de cupones.',
    },
    cash: {
      name: 'Monetarios / Liquidez',
      color: '#06b6d4',
      role: 'Liquidez inmediata y pólvora seca (Dry Powder) para compras oportunistas.',
    },
    commodity: {
      name: 'Materias Primas / Oro',
      color: '#f59e0b',
      role: 'Descorrelación macro y cobertura frente a inflación estructural.',
    },
    crypto: {
      name: 'Criptoactivos',
      color: '#8b5cf6',
      role: 'Activo digital de alta volatilidad y perfil asimétrico.',
    },
  }

  const assetClassBreakdown: AssetClassItem[] = Object.entries(assetClassValues).map(([id, val]) => {
    const meta = ASSET_CLASS_META[id] || { name: id, color: '#64748b', role: 'Activo no clasificado.' }
    return {
      id,
      name: meta.name,
      weight: (val / totalValue) * 100,
      value: val,
      color: meta.color,
      roleDescription: meta.role,
    }
  }).sort((a, b) => b.weight - a.weight)

  // Inferred Risk Profile Scanner
  const equityRatio = assetClassBreakdown.find((a) => a.id === 'equity')?.weight ?? 0
  const fixedIncomeRatio = assetClassBreakdown.find((a) => a.id === 'fixed_income')?.weight ?? 0
  const cashRatio = assetClassBreakdown.find((a) => a.id === 'cash')?.weight ?? 0
  const cashAmount = assetClassBreakdown.find((a) => a.id === 'cash')?.value ?? 0

  let inferredProfile: InferredRiskProfile
  if (equityRatio >= 80) {
    inferredProfile = {
      name: 'Crecimiento Decidido / Renta Variable Pura',
      tagline: 'Máxima capitalización compuesta con tolerancia a volatilidad de mercado.',
      equityRatio,
      fixedIncomeRatio,
      cashRatio,
      recommendedHorizon: '≥ 8 - 10 años',
      expectedVolatilityPct: 15.6,
      historicalMaxDrawdownPct: -38.5,
      expectedRealReturnPct: 7.2,
      dryPowderAmount: cashAmount,
      dryPowderPct: cashRatio,
    }
  } else if (equityRatio >= 60) {
    inferredProfile = {
      name: 'Crecimiento Dinámico (75/25)',
      tagline: 'Predominio de renta variable con colchón de rentas defensivas.',
      equityRatio,
      fixedIncomeRatio,
      cashRatio,
      recommendedHorizon: '≥ 5 - 7 años',
      expectedVolatilityPct: 12.2,
      historicalMaxDrawdownPct: -26.0,
      expectedRealReturnPct: 5.8,
      dryPowderAmount: cashAmount,
      dryPowderPct: cashRatio,
    }
  } else if (equityRatio >= 35) {
    inferredProfile = {
      name: 'Equilibrado / Balanceado (60/40)',
      tagline: 'Equilibrio estricto entre crecimiento de capital y control del drawdown.',
      equityRatio,
      fixedIncomeRatio,
      cashRatio,
      recommendedHorizon: '≥ 3 - 5 años',
      expectedVolatilityPct: 8.4,
      historicalMaxDrawdownPct: -16.5,
      expectedRealReturnPct: 4.2,
      dryPowderAmount: cashAmount,
      dryPowderPct: cashRatio,
    }
  } else {
    inferredProfile = {
      name: 'Conservador / Preservación',
      tagline: 'Prioridad estricta en estabilidad patrimonial, liquidez y tipos de interés.',
      equityRatio,
      fixedIncomeRatio,
      cashRatio,
      recommendedHorizon: '1 - 3 años',
      expectedVolatilityPct: 4.6,
      historicalMaxDrawdownPct: -8.0,
      expectedRealReturnPct: 2.2,
      dryPowderAmount: cashAmount,
      dryPowderPct: cashRatio,
    }
  }

  // 6. Swensen 5/25 Tolerance Bands Monitor
  const rebalanceBands: RebalanceBandItem[] = geographicBreakdown.map((item) => {
    const target = item.worldWeight
    const bandTolerance = Math.min(5.0, Math.max(1.5, target * 0.25))
    const lowerBand = Math.max(0, target - bandTolerance)
    const upperBand = target + bandTolerance
    const inBand = item.portfolioWeight >= lowerBand && item.portfolioWeight <= upperBand
    const deviationAbs = Math.abs(item.portfolioWeight - target)
    const deviationRel = (deviationAbs / (target || 1)) * 100

    let urgency: 'optimal' | 'warning' | 'critical' = 'optimal'
    if (!inBand) {
      urgency = deviationAbs > 7.5 ? 'critical' : 'warning'
    }

    return {
      regionId: item.region.id,
      regionName: item.region.name,
      flag: item.region.flag,
      currentWeight: item.portfolioWeight,
      targetWeight: target,
      currentValue: item.portfolioValue,
      lowerBand,
      upperBand,
      inBand,
      deviationAbs,
      deviationRel,
      urgency,
    }
  })

  // 7. Calculate Diversification Health Score (0 - 100)
  let score = 0
  const activeRegions = geographicBreakdown.filter((g) => g.portfolioWeight >= 2.0).length
  if (activeRegions >= 5) score += 35
  else if (activeRegions === 4) score += 30
  else if (activeRegions === 3) score += 22
  else score += 12

  const topGeoWeight = geographicBreakdown[0]?.portfolioWeight || 100
  if (topGeoWeight <= 68) score += 35
  else if (topGeoWeight <= 78) score += 28
  else if (topGeoWeight <= 88) score += 18
  else score += 8

  const activeSectors = sectorBreakdown.filter((s) => s.portfolioWeight >= 4.0).length
  if (activeSectors >= 7) score += 15
  else if (activeSectors >= 5) score += 12
  else score += 7

  const sortedPos = [...validPositions].sort((a, b) => (b.current_value || 0) - (a.current_value || 0))
  const top3Weight = sortedPos.slice(0, 3).reduce((acc, p) => acc + ((p.current_value || 0) / totalValue) * 100, 0)
  if (top3Weight <= 50) score += 15
  else if (top3Weight <= 65) score += 12
  else if (top3Weight <= 80) score += 8
  else score += 4

  score = Math.min(100, Math.max(10, Math.round(score)))

  let scoreLabel = 'Diversificación Moderada'
  let scoreColor = '#f59e0b'
  if (score >= 85) {
    scoreLabel = 'Excelente Diversificación Global'
    scoreColor = '#10b981'
  } else if (score >= 70) {
    scoreLabel = 'Buena Diversificación Global'
    scoreColor = '#3b82f6'
  } else if (score < 50) {
    scoreLabel = 'Alta Concentración Regional'
    scoreColor = '#ef4444'
  }

  // 8. Key metrics & Narrative Verdict Generation
  const naItem = geographicBreakdown.find((g) => g.region.id === 'north_america')
  const euItem = geographicBreakdown.find((g) => g.region.id === 'europe')
  const emItem = geographicBreakdown.find((g) => g.region.id === 'emerging')
  const jpItem = geographicBreakdown.find((g) => g.region.id === 'japan')

  const usExposurePct = naItem?.portfolioWeight ?? 0
  const europeWeight = euItem?.portfolioWeight ?? 0
  const homeBiasPct = europeWeight - 15.4
  const emergingWeight = emItem?.portfolioWeight ?? 0
  const emergingGapPct = 10.2 - emergingWeight

  const verdictParagraphs: string[] = []

  if (Math.abs(usExposurePct - 63.8) <= 5.0) {
    verdictParagraphs.push(
      `Tu exposición a **Norteamérica (${usExposurePct.toFixed(1)}%)** está **prácticamente calcada al índice mundial MSCI ACWI (63.8%)**, asegurando que capturas el motor de beneficios de Wall Street sin sobreexposición excesiva.`
    )
  } else if (usExposurePct > 63.8) {
    verdictParagraphs.push(
      `Mantienes un sesgo favorable hacia **Norteamérica (${usExposurePct.toFixed(1)}%)**, superando en **+${(usExposurePct - 63.8).toFixed(1)}%** el peso de la capitalización mundial, impulsado por tus fondos globales y tecnológicos.`
    )
  } else {
    verdictParagraphs.push(
      `Tu peso en **Norteamérica (${usExposurePct.toFixed(1)}%)** es inferior al mercado mundial (63.8%), lo que te otorga un perfil más defensivo frente al ciclo estadounidense.`
    )
  }

  if (homeBiasPct > 4.0) {
    verdictParagraphs.push(
      `Presentas un **sesgo local moderado hacia Europa (${europeWeight.toFixed(1)}% vs 15.4% mundial)** (+${homeBiasPct.toFixed(1)}%). Esta sobreponderación es habitual y beneficiosa para reducir la volatilidad del tipo de cambio euro/dólar.`
    )
  } else {
    verdictParagraphs.push(
      `Tu peso en **Europa (${europeWeight.toFixed(1)}%)** se encuentra muy equilibrado frente al benchmark mundial (15.4%), evitando la trampa del sesgo doméstico extremo.`
    )
  }

  if (emergingGapPct > 2.0) {
    verdictParagraphs.push(
      `Tu principal área de mejora para una réplica pura del mundo se sitúa en **Mercados Emergentes (${emergingWeight.toFixed(1)}% vs 10.2% mundial)**. Estás infraponderado en un **${emergingGapPct.toFixed(1)}%**.`
    )
  } else {
    verdictParagraphs.push(
      `Cuentas con una sólida cobertura en **Mercados Emergentes (${emergingWeight.toFixed(1)}%)** y **Japón (${(jpItem?.portfolioWeight ?? 0).toFixed(1)}%)**, garantizando acceso a demografía y ciclos asiáticos.`
    )
  }

  // 9. Rebalance Suggestions
  const rebalanceSuggestions: DiversificationDiagnosis['rebalanceSuggestions'] = []

  if (emergingGapPct > 2.5) {
    rebalanceSuggestions.push({
      action: 'increase',
      title: 'Aumentar aportaciones en Mercados Emergentes',
      description: `Tienes un déficit de ${emergingGapPct.toFixed(1)}% respecto a la economía mundial. Priorizar aportaciones a índices emergentes aumentará tu potencial demográfico.`,
      targetRegion: 'Mercados Emergentes',
    })
  }

  if (homeBiasPct > 8.0) {
    rebalanceSuggestions.push({
      action: 'decrease',
      title: 'Moderar nuevas aportaciones a Europa',
      description: `Tu cartera supera en +${homeBiasPct.toFixed(1)}% la capitalización europea. Dirigir nuevos fondos al índice global equilibrará la cartera.`,
      targetRegion: 'Europa Desarrollada',
    })
  }

  const techWeight = sectorBreakdown.find((s) => s.sector.id === 'tech')?.portfolioWeight || 0
  if (techWeight > 35.0) {
    rebalanceSuggestions.push({
      action: 'maintain',
      title: 'Vigilar concentración en Tecnología',
      description: `El sector tecnológico acumula el ${techWeight.toFixed(1)}% de tu cartera (vs 25.2% del mundo). Excelente en mercados alcistas, pero con mayor volatilidad.`,
      targetRegion: 'Sector Tecnología',
    })
  }

  if (rebalanceSuggestions.length === 0) {
    rebalanceSuggestions.push({
      action: 'maintain',
      title: 'Mantener estrategia actual de aportaciones',
      description: 'Tu estructura de activos refleja una correlación de nivel institucional con los principales índices globales.',
      targetRegion: 'Estrategia Global',
    })
  }

  return {
    score,
    scoreLabel,
    scoreColor,
    verdictTitle: `Diagnóstico de Diversificación: ${score}/100 • ${scoreLabel}`,
    verdictParagraphs,
    topRegion: geographicBreakdown[0],
    homeBiasPct,
    usExposurePct,
    emergingGapPct,
    rebalanceSuggestions,
    geographicBreakdown,
    sectorBreakdown,
    superSectors,
    sectorHhi,
    top3SectorsWeight,
    currencyBreakdown,
    fxSensitivity,
    assetClassBreakdown,
    inferredProfile,
    rebalanceBands,
    totalPortfolioValue: totalValue,
  }
}

/**
 * Smart Cash-Flow Rebalancing Calculator (Zero-tax rebalancing via new inflows)
 */
export function calculateCashFlowRebalance(
  totalPortfolioValue: number,
  geographicBreakdown: GeographicComparisonItem[],
  newCashAmount: number
): CashFlowRebalanceItem[] {
  const newTotal = totalPortfolioValue + newCashAmount

  // 1. Calculate deficit for each region
  const deficits = geographicBreakdown.map((item) => {
    const targetValue = newTotal * (item.worldWeight / 100)
    const currentValue = item.portfolioValue
    const deficit = Math.max(0, targetValue - currentValue)
    return {
      regionId: item.region.id,
      regionName: item.region.name,
      flag: item.region.flag,
      currentValue,
      currentWeight: item.portfolioWeight,
      targetWeight: item.worldWeight,
      targetValue,
      deficit,
    }
  })

  const totalDeficit = deficits.reduce((acc, d) => acc + d.deficit, 0)

  // 2. Allocate new cash
  return deficits.map((d) => {
    let allocated = 0
    if (totalDeficit > 0 && newCashAmount > 0) {
      allocated = newCashAmount * (d.deficit / totalDeficit)
    } else if (newCashAmount > 0) {
      allocated = newCashAmount * (d.targetWeight / 100)
    }

    const projectedValue = d.currentValue + allocated
    const projectedWeight = (projectedValue / newTotal) * 100

    return {
      regionId: d.regionId,
      regionName: d.regionName,
      flag: d.flag,
      suggestedCashAmount: allocated,
      suggestedCashShare: newCashAmount > 0 ? (allocated / newCashAmount) * 100 : 0,
      currentWeight: d.currentWeight,
      projectedWeight,
      targetWeight: d.targetWeight,
    }
  })
}
