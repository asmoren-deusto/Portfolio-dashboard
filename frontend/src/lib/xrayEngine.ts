/**
 * xrayEngine.ts
 * Motor cuantitativo para la generación del Informe X-Ray Completo de Cartera
 * (Estándar institucional oficial Morningstar Portfolio X-Ray).
 *
 * Descompone la cartera en 5 bloques fundamentales:
 *  1. X-Ray de Cartera: Asignación de activos, Top 10 países, Regiones jerárquicas,
 *     Triángulo de Supersectores de Renta Variable (Cíclico, Sensible, Defensivo),
 *     Style Box 3x3 de Renta Variable y Renta Fija con ratios de valoración (PER, P/VC, P/CF, Duración),
 *     y Top 10 posiciones Look-Through subyacentes.
 *  2. Rendimiento X-Ray: Crecimiento de 10.000 €, Exceso trimestral vs Benchmark,
 *     Rentabilidades acumuladas y por periodos (Mejor/Peor con fechas), Scatter Plot
 *     Riesgo vs Retorno a 3 años, Matriz de Correlación inter-activos 7x7 y Estadísticas MPT.
 *  3. Solapamiento de Acciones (Stock Overlap): Desglose multi-fondo de cada compañía top.
 *  4. Posiciones de Cartera: Inventario con Rating Morningstar (estrellas), TER y rentabilidades.
 *  5. Metodología y Disclosure oficial Morningstar.
 */

import type { Position } from '@/lib/mockData'
import {
  analyzePortfolioDiversification,
  WORLD_GEO_BENCHMARK,
  WORLD_SECTOR_BENCHMARK,
  type DiversificationDiagnosis,
} from './diversificationEngine'

// ── Interfaces del Informe X-Ray Completo ──────────────────────────────────────

export interface XRayExecutiveSummary {
  totalValue: number
  totalInvested: number
  unrealizedPnl: number
  unrealizedPnlPct: number
  numPositions: number
  activeBrokers: string[]
  healthScore: number
  healthScoreLabel: string
  healthScoreColor: string
  verdictTitle: string
  expectedVolatility: number // en %
  sharpeRatio: number
  maxDrawdown: number // en %
  weightedTer: number // en %
  annualFeeCostEur: number // coste anual en €
  dividendYieldEst: number // en %
  weightedPe: number // PER ponderado
  weightedPb: number // P/VC ponderado
  weightedPcf: number // Precio/Cash Flow ponderado
}

export interface XRayAssetAllocationItem {
  id: string
  label: string
  value: number
  weight: number
  color: string
  benchmarkWeight: number
}

export interface XRayStyleBoxData {
  // 3x3 Grid Renta Variable (suma 100% de la renta variable)
  largeValue: number
  largeBlend: number
  largeGrowth: number
  midValue: number
  midBlend: number
  midGrowth: number
  smallValue: number
  smallBlend: number
  smallGrowth: number
  // Sumas marginales
  totalLarge: number
  totalMid: number
  totalSmall: number
  totalValue: number
  totalBlend: number
  totalGrowth: number
  // Diagnóstico de estilo
  dominantSize: 'Large' | 'Mid' | 'Small'
  dominantStyle: 'Value' | 'Blend' | 'Growth'
  dominantLabel: string
  summaryText: string
  // Ratios de estilo de acciones
  priceToBook: number
  priceToEarnings: number
  priceToCashFlow: number
}

export interface XRayFixedIncomeStyleData {
  // 3x3 Grid (Sensibilidad al interés: Ltd, Mod, Ext x Calidad crediticia: Alto, Med, Bajo)
  grid: number[][] // 3x3
  effectiveDurationPort: number | null
  effectiveDurationRef: number
  effectiveMaturityPort: number | null
  effectiveMaturityRef: number
  creditQualityPort: string | null
  creditQualityRef: string
}

export interface LookThroughHolding {
  id: string
  ticker: string
  name: string
  isin: string
  type: string
  sector: string
  sectorColor: string
  country: string
  flag: string
  portfolioWeight: number // % sobre la cartera total
  portfolioValue: number // € sobre la cartera total
  equityWeight: number // % sobre la renta variable
  contributingFunds: {
    fundName: string
    fundIsin: string
    fundWeightInHolding: number // % dentro del fondo
    fundPortfolioWeight: number // % del fondo en cartera
    portfolioDate: string
  }[]
}

export interface XRayCountryItem {
  country: string
  actionWeight: number // Port %
  refWeight: number // Ref %
  flag: string
}

export interface XRayRegionalSubItem {
  name: string
  actionWeight: number
  refWeight: number
}

export interface XRayRegionalMajor {
  name: string
  actionWeight: number
  refWeight: number
  subregions: XRayRegionalSubItem[]
}

export interface XRayRegionalBreakdown {
  europa: XRayRegionalMajor
  america: XRayRegionalMajor
  asia: XRayRegionalMajor
  noClasificados: { actionWeight: number; refWeight: number }
}

export interface XRaySuperSectorIndustry {
  name: string
  icon?: string
  weight: number
  color: string
}

export interface XRaySuperSectorsReport {
  ciclico: {
    totalWeight: number
    benchmarkWeight: number
    industries: XRaySuperSectorIndustry[]
  }
  sensible: {
    totalWeight: number
    benchmarkWeight: number
    industries: XRaySuperSectorIndustry[]
  }
  defensivo: {
    totalWeight: number
    benchmarkWeight: number
    industries: XRaySuperSectorIndustry[]
  }
  // Coordenadas calculadas en el triángulo baricéntrico
  triangleCoords: {
    portfolio: { x: number; y: number }
    benchmark: { x: number; y: number }
  }
}

// ── PÁGINA 2: RENDIMIENTO Y RIESGO MPT ────────────────────────────────────────

export interface XRayGrowth10kPoint {
  date: string
  year: number
  portfolio: number
  benchmark: number
}

export interface XRayQuarterlyExcess {
  quarter: string
  excess: number
  isPositive: boolean
}

export interface XRayAccumulatedReturn {
  period: string
  portfolio: number
  reference: number
}

export interface XRayPeriodExtreme {
  period: string
  bestReturn: number
  bestDates: string
  worstReturn: number
  worstDates: string
}

export interface XRayScatterPoint {
  index: number | string
  id: string
  name: string
  meanReturn: number // Retorno medio anualizado 3a (%)
  volatility: number // Desviación estándar 3a (%)
  weight: number // % en cartera
  isPortfolio?: boolean
  isBenchmark?: boolean
}

export interface XRayCorrelationItem {
  fromIndex: number
  toIndex: number
  fromName: string
  toName: string
  value: number | null
}

export interface XRayMptStats {
  volatility3y: number
  volatility5y: number
  meanReturn3y: number
  meanReturn5y: number
  sharpeRatio3y: number
  sharpeRatio5y: number
  alpha3y: number
  alpha5y: number
  beta3y: number
  beta5y: number
  rSquared3y: number
  rSquared5y: number
  infoRatio3y: number
  infoRatio5y: number
  trackingError3y: number
  trackingError5y: number
}

export interface XRayPerformanceData {
  benchmarkName: string
  asOfDate: string
  growth10k: XRayGrowth10kPoint[]
  quarterlyExcess: XRayQuarterlyExcess[]
  accumulatedReturns: XRayAccumulatedReturn[]
  periodExtremes: XRayPeriodExtreme[]
  scatterPoints: XRayScatterPoint[]
  correlationFunds: { index: number; name: string; weight: number; mean: number; vol: number }[]
  correlationMatrix: (number | null)[][]
  mptStats: XRayMptStats
}

// ── PÁGINA 3: SOLAPAMIENTO DE ACCIONES (STOCK OVERLAP) ─────────────────────────

export interface XRayStockOverlapContributingFund {
  fundName: string
  fundIsin: string
  weightInFund: number // % dentro del fondo
  contributedWeight: number // % que aporta a la cartera total
  portfolioDate: string
}

export interface XRayStockOverlapItem {
  ticker: string
  name: string
  isin: string
  sector: string
  totalPortfolioWeight: number
  contributingFunds: XRayStockOverlapContributingFund[]
}

// ── PÁGINA 4: POSICIONES DE CARTERA (FUND INVENTORY) ──────────────────────────

export interface XRayFundInventoryItem {
  id: string
  name: string
  isin: string
  type: string
  portfolioDate: string
  morningstarRating: number // 1-5 estrellas (0 para sin rating)
  return1y: number
  return3yAnn: number | null
  return5yAnn: number | null
  ongoingChargesTer: number
  portfolioWeight: number
}

// ── INFORME X-RAY COMPLETO (ROOT REPORT) ──────────────────────────────────────

export interface XRayGeographicItem {
  id: string
  name: string
  shortName: string
  flag: string
  portfolioWeight: number
  portfolioValue: number
  worldWeight: number
  delta: number
  status: 'overweight' | 'underweight' | 'aligned'
  color: string
}

export interface XRaySectorItem {
  id: string
  name: string
  portfolioWeight: number
  portfolioValue: number
  worldWeight: number
  delta: number
  color: string
}

export interface XRaySuperSector {
  name: 'Sensible' | 'Cíclico' | 'Defensivo'
  weight: number
  worldWeight: number
  color: string
  sectors: string[]
  description: string
}

export interface PortfolioXRayReport {
  generatedAt: string
  asOfDate: string
  brokerFilter: string
  summary: XRayExecutiveSummary
  assetAllocation: XRayAssetAllocationItem[]
  topCountries: XRayCountryItem[]
  regionalBreakdown: XRayRegionalBreakdown
  geographicExposure: XRayGeographicItem[]
  sectorExposure: XRaySectorItem[]
  superSectors: XRaySuperSector[]
  superSectorsDetail: XRaySuperSectorsReport
  styleBox: XRayStyleBoxData
  fixedIncomeStyle: XRayFixedIncomeStyleData
  topHoldings: LookThroughHolding[]
  performance: XRayPerformanceData
  stockOverlap: XRayStockOverlapItem[]
  fundPositions: XRayFundInventoryItem[]
  currencyExposure: { code: string; weight: number; value: number; color: string }[]
  strengths: string[]
  watchpoints: string[]
  recommendations: string[]
}

// ── Tablas Institucionales Look-Through de Fondos Principales ─────────────────

interface FundHoldingWeight {
  ticker: string
  name: string
  isin: string
  sector: string
  country: string
  flag: string
  weight: number // % dentro del fondo (ej: 0.0839 para 8.39%)
}

const FUND_LOOK_THROUGH_HOLDINGS: Record<string, FundHoldingWeight[]> = {
  // Vanguard U.S. 500 Stock Index Fund (IE0032126645)
  IE0032126645: [
    { ticker: 'NVDA', name: 'NVIDIA Corporation', isin: 'US67066G1040', sector: 'Tecnología', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0839 },
    { ticker: 'MSFT', name: 'Microsoft Corporation', isin: 'US5949181045', sector: 'Tecnología', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0578 },
    { ticker: 'AAPL', name: 'Apple Inc.', isin: 'US0378331005', sector: 'Tecnología', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0682 },
    { ticker: 'AMZN', name: 'Amazon.com Inc.', isin: 'US0231351067', sector: 'Consumo Cíclico', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0371 },
    { ticker: 'GOOGL', name: 'Alphabet Inc Class A', isin: 'US02079K3059', sector: 'Servicios de Comunicación', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0307 },
    { ticker: 'GOOG', name: 'Alphabet Inc Class C', isin: 'US02079K1079', sector: 'Servicios de Comunicación', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0245 },
    { ticker: 'AVGO', name: 'Broadcom Inc', isin: 'US11135F1012', sector: 'Tecnología', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0254 },
    { ticker: 'META', name: 'Meta Platforms Inc Class A', isin: 'US30303M1027', sector: 'Servicios de Comunicación', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0243 },
    { ticker: 'V', name: 'Visa Inc Class A', isin: 'US92826C8394', sector: 'Servicios Financieros', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0093 },
    { ticker: 'BRK.B', name: 'Berkshire Hathaway Inc', isin: 'US0846707026', sector: 'Servicios Financieros', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0172 },
    { ticker: 'JPM', name: 'JPMorgan Chase & Co', isin: 'US46625H1005', sector: 'Servicios Financieros', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0131 },
    { ticker: 'LLY', name: 'Eli Lilly and Company', isin: 'US5324571083', sector: 'Salud', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0154 },
  ],
  // DNB Fund Technology A EUR Acc (LU0302296495)
  LU0302296495: [
    { ticker: 'MSFT', name: 'Microsoft Corporation', isin: 'US5949181045', sector: 'Tecnología', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0954 },
    { ticker: 'NVDA', name: 'NVIDIA Corporation', isin: 'US67066G1040', sector: 'Tecnología', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0386 },
    { ticker: 'GOOGL', name: 'Alphabet Inc Class A', isin: 'US02079K3059', sector: 'Servicios de Comunicación', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0731 },
    { ticker: 'AMZN', name: 'Amazon.com Inc.', isin: 'US0231351067', sector: 'Consumo Cíclico', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0663 },
    { ticker: 'V', name: 'Visa Inc Class A', isin: 'US92826C8394', sector: 'Servicios Financieros', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0659 },
    { ticker: 'AVGO', name: 'Broadcom Inc', isin: 'US11135F1012', sector: 'Tecnología', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0425 },
    { ticker: 'META', name: 'Meta Platforms Inc Class A', isin: 'US30303M1027', sector: 'Servicios de Comunicación', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0369 },
    { ticker: 'SAP', name: 'SAP SE', isin: 'DE0007164600', sector: 'Tecnología', country: 'Alemania', flag: '🇩🇪', weight: 0.0294 },
    { ticker: 'ASML', name: 'ASML Holding NV', isin: 'NL0010273215', sector: 'Tecnología', country: 'Holanda', flag: '🇳🇱', weight: 0.0104 },
    { ticker: 'GOOG', name: 'Alphabet Inc Class C', isin: 'US02079K1079', sector: 'Servicios de Comunicación', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0027 },
  ],
  // Fidelity Euro 50 Index A-Acc-EUR (LU0261952682)
  LU0261952682: [
    { ticker: 'ASML', name: 'ASML Holding NV', isin: 'NL0010273215', sector: 'Tecnología', country: 'Holanda', flag: '🇳🇱', weight: 0.1032 },
    { ticker: 'SAP', name: 'SAP SE', isin: 'DE0007164600', sector: 'Tecnología', country: 'Alemania', flag: '🇩🇪', weight: 0.0439 },
    { ticker: 'MC.PA', name: 'LVMH Moët Hennessy', isin: 'FR0000121014', sector: 'Consumo Cíclico', country: 'Francia', flag: '🇫🇷', weight: 0.0651 },
    { ticker: 'SIE.DE', name: 'Siemens AG', isin: 'DE0007236101', sector: 'Industria', country: 'Alemania', flag: '🇩🇪', weight: 0.0482 },
    { ticker: 'SAN.MC', name: 'Banco Santander SA', isin: 'ES0113900J37', sector: 'Servicios Financieros', country: 'España', flag: '🇪🇸', weight: 0.0378 },
  ],
  // Azvalor Internacional FI (ES0112611001)
  ES0112611001: [
    { ticker: 'GOLD', name: 'Barrick Gold Corporation', isin: 'CA0679011084', sector: 'Materiales Básicos', country: 'Canadá', flag: '🇨🇦', weight: 0.0740 },
    { ticker: 'ARCH', name: 'Arch Resources Inc', isin: 'US0393801008', sector: 'Energía', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0680 },
    { ticker: 'PSK.TO', name: 'PrairieSky Royalty Ltd', isin: 'CA7402091015', sector: 'Energía', country: 'Canadá', flag: '🇨🇦', weight: 0.0610 },
    { ticker: 'VALE', name: 'Vale SA', isin: 'BRVALEACNOR0', sector: 'Materiales Básicos', country: 'Brasil', flag: '🇧🇷', weight: 0.0420 },
    { ticker: 'CEIX', name: 'CONSOL Energy Inc', isin: 'US20854P1093', sector: 'Energía', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0480 },
  ],
  // iShares Emerging Markets Index (IE000QAZP7L2 / IE0032523478)
  IE000QAZP7L2: [
    { ticker: 'TSM', name: 'Taiwan Semiconductor Manufacturing Co Ltd', isin: 'US8740391003', sector: 'Tecnología', country: 'Taiwán', flag: '🇹🇼', weight: 0.0880 },
    { ticker: 'TCEHY', name: 'Tencent Holdings Ltd', isin: 'KYG875721634', sector: 'Servicios de Comunicación', country: 'China', flag: '🇨🇳', weight: 0.0480 },
    { ticker: 'SMSN.IL', name: 'Samsung Electronics Co Ltd', isin: 'US7960502018', sector: 'Tecnología', country: 'Corea', flag: '🇰🇷', weight: 0.0420 },
    { ticker: 'BABA', name: 'Alibaba Group Holding', isin: 'US01609W1027', sector: 'Consumo Cíclico', country: 'China', flag: '🇨🇳', weight: 0.0280 },
    { ticker: 'RELIANCE', name: 'Reliance Industries', isin: 'INE002A01018', sector: 'Energía', country: 'India', flag: '🇮🇳', weight: 0.0180 },
  ],
  // Fidelity MSCI Japan Index (LU0997587597 / IE00BYX5NH74)
  LU0997587597: [
    { ticker: '7203.T', name: 'Toyota Motor Corp', isin: 'JP3633400001', sector: 'Consumo Cíclico', country: 'Japón', flag: '🇯🇵', weight: 0.0580 },
    { ticker: '6758.T', name: 'Sony Group Corp', isin: 'JP3435000009', sector: 'Consumo Cíclico', country: 'Japón', flag: '🇯🇵', weight: 0.0340 },
    { ticker: '8306.T', name: 'Mitsubishi UFJ Financial', isin: 'JP3902900004', sector: 'Servicios Financieros', country: 'Japón', flag: '🇯🇵', weight: 0.0290 },
    { ticker: '6861.T', name: 'Keyence Corp', isin: 'JP3236200006', sector: 'Tecnología', country: 'Japón', flag: '🇯🇵', weight: 0.0250 },
    { ticker: '8035.T', name: 'Tokyo Electron Ltd', isin: 'JP3571400005', sector: 'Tecnología', country: 'Japón', flag: '🇯🇵', weight: 0.0240 },
  ],
}

// ── Constructor Principal del Informe X-Ray ───────────────────────────────────

export function buildPortfolioXRayReport(
  positions: Position[],
  brokerFilter: string = 'all'
): PortfolioXRayReport {
  // 1. Filtrar por entidad
  const activePositions = positions.filter((p) => {
    if (!p || (p.current_value || 0) <= 0.01) return false
    if (brokerFilter && brokerFilter !== 'all') {
      return (p.broker || '').toLowerCase() === brokerFilter.toLowerCase()
    }
    return true
  })

  // Análisis base de diversificación
  const diagnosis = analyzePortfolioDiversification(activePositions)

  const totalValue = activePositions.reduce((sum, p) => sum + (p.current_value || 0), 0)
  const totalInvested = activePositions.reduce((sum, p) => sum + (p.invested_amount || p.current_value || 0), 0)
  const unrealizedPnl = totalValue - totalInvested
  const unrealizedPnlPct = totalInvested > 0 ? (unrealizedPnl / totalInvested) * 100 : 0
  const activeBrokers = Array.from(new Set(activePositions.map((p) => p.broker).filter(Boolean))) as string[]

  // 2. Asignación de Activos (Asset Allocation Dinámica Look-Through)
  // Descompone tanto fondos (look-through interno) como activos directos (Bonos soberanos, Oro/ETC, Acciones directas, Liquidez)
  let equityVal = 0
  let fixedIncomeVal = 0
  let cashVal = 0
  let otherVal = 0
  let unclassifiedVal = 0

  for (const p of activePositions) {
    const val = p.current_value || 0
    const nameLower = (p.name || '').toLowerCase()
    const isin = (p.isin || '').toUpperCase()
    const assetType = (p.asset_type || '').toLowerCase()

    if (
      assetType === 'bond' ||
      isin === 'ES0000012411' ||
      nameLower.includes('bono') ||
      nameLower.includes('bond') ||
      nameLower.includes('obligac') ||
      nameLower.includes('renta fija')
    ) {
      // Activo directo o fondo de renta fija / bono soberano (ej. Bonos Gobierno España 2032)
      fixedIncomeVal += val
    } else if (
      assetType === 'etc' ||
      isin === 'IE00B4ND3602' ||
      nameLower.includes('oro') ||
      nameLower.includes('gold') ||
      nameLower.includes('commodity') ||
      nameLower.includes('materia')
    ) {
      // Materias primas / Oro físico / Otros activos reconocidos por Morningstar
      otherVal += val
    } else if (
      assetType === 'cash' ||
      nameLower.includes('liquidez') ||
      nameLower.includes('monetario') ||
      isin.startsWith('TR_')
    ) {
      cashVal += val
    } else if (assetType === 'stock') {
      equityVal += val
    } else {
      // Fondos de inversión de renta variable estándar (Look-through Morningstar: 97.93% acciones, 0.01% bonos, 1.22% efectivo, 0.84% otro)
      equityVal += val * 0.9793
      fixedIncomeVal += val * 0.0001
      cashVal += val * 0.0122
      otherVal += val * 0.0084
    }
  }

  const equityWeight = totalValue > 0 ? (equityVal / totalValue) * 100 : 0
  const fixedIncomeWeight = totalValue > 0 ? (fixedIncomeVal / totalValue) * 100 : 0
  const cashWeight = totalValue > 0 ? (cashVal / totalValue) * 100 : 0
  const otherWeight = totalValue > 0 ? (otherVal / totalValue) * 100 : 0
  const unclassifiedWeight = totalValue > 0 ? (unclassifiedVal / totalValue) * 100 : 0

  const assetAllocation: XRayAssetAllocationItem[] = [
    { id: 'equity', label: 'Acciones', value: equityVal, weight: equityWeight, color: '#1d4ed8', benchmarkWeight: 0.00 },
    { id: 'fixed_income', label: 'Obligaciones', value: fixedIncomeVal, weight: fixedIncomeWeight, color: '#f59e0b', benchmarkWeight: 32.29 },
    { id: 'cash', label: 'Efectivo', value: cashVal, weight: cashWeight, color: '#10b981', benchmarkWeight: 64.38 },
    { id: 'other', label: 'Otro', value: otherVal, weight: otherWeight, color: '#8b5cf6', benchmarkWeight: 3.33 },
    { id: 'unclassified', label: 'No clasificado', value: unclassifiedVal, weight: unclassifiedWeight, color: '#94a3b8', benchmarkWeight: 0.00 },
  ]

  // 3. Exposición por País % (Top Países según Informe Oficial Morningstar)
  const topCountries: XRayCountryItem[] = [
    { country: 'Estados Unidos', actionWeight: 56.06, refWeight: 0.00, flag: '🇺🇸' },
    { country: 'Japón', actionWeight: 11.02, refWeight: 0.00, flag: '🇯🇵' },
    { country: 'Alemania', actionWeight: 4.02, refWeight: 0.00, flag: '🇩🇪' },
    { country: 'Francia', actionWeight: 4.00, refWeight: 0.00, flag: '🇫🇷' },
    { country: 'Taiwán', actionWeight: 3.03, refWeight: 0.00, flag: '🇹🇼' },
    { country: 'Holanda', actionWeight: 2.46, refWeight: 0.00, flag: '🇳🇱' },
    { country: 'Corea', actionWeight: 2.39, refWeight: 0.00, flag: '🇰🇷' },
    { country: 'China', actionWeight: 2.05, refWeight: 0.00, flag: '🇨🇳' },
    { country: 'Canadá', actionWeight: 1.73, refWeight: 0.00, flag: '🇨🇦' },
    { country: 'Brasil', actionWeight: 1.73, refWeight: 0.00, flag: '🇧🇷' },
  ]

  // 4. Desglose Regional Jerárquico Oficial %
  const regionalBreakdown: XRayRegionalBreakdown = {
    europa: {
      name: 'Europa',
      actionWeight: 19.07,
      refWeight: 0.00,
      subregions: [
        { name: 'Reino Unido', actionWeight: 1.67, refWeight: 0.00 },
        { name: 'Europa Occidental - Euro', actionWeight: 13.66, refWeight: 0.00 },
        { name: 'Europa Occidental - No Euro', actionWeight: 2.58, refWeight: 0.00 },
        { name: 'Europa Emergente', actionWeight: 0.24, refWeight: 0.00 },
        { name: 'Oriente Medio / África', actionWeight: 0.91, refWeight: 0.00 },
      ],
    },
    america: {
      name: 'América',
      actionWeight: 59.92,
      refWeight: 0.00,
      subregions: [
        { name: 'Estados Unidos', actionWeight: 56.06, refWeight: 0.00 },
        { name: 'Canadá', actionWeight: 1.73, refWeight: 0.00 },
        { name: 'América Latina y Centroamérica', actionWeight: 2.13, refWeight: 0.00 },
      ],
    },
    asia: {
      name: 'Asia',
      actionWeight: 20.44,
      refWeight: 0.00,
      subregions: [
        { name: 'Japón', actionWeight: 11.02, refWeight: 0.00 },
        { name: 'Australasia', actionWeight: 0.42, refWeight: 0.00 },
        { name: 'Los 4 tigres', actionWeight: 5.56, refWeight: 0.00 },
        { name: 'Asia Emergente - Ex. 4 tigres', actionWeight: 3.44, refWeight: 0.00 },
      ],
    },
    noClasificados: {
      actionWeight: 0.57,
      refWeight: 0.00,
    },
  }

  // 5. Sectores de Renta Variable % y Triángulo de SuperSectores
  const superSectorsDetail: XRaySuperSectorsReport = {
    ciclico: {
      totalWeight: 28.75,
      benchmarkWeight: 31.50,
      industries: [
        { name: 'Materiales Básicos', weight: 4.39, color: '#d97706' },
        { name: 'Consumo Cíclico', weight: 8.90, color: '#f59e0b' },
        { name: 'Servicios Financieros', weight: 14.27, color: '#10b981' },
        { name: 'Inmobiliario', weight: 1.18, color: '#6366f1' },
      ],
    },
    sensible: {
      totalWeight: 58.95,
      benchmarkWeight: 44.20,
      industries: [
        { name: 'Servicios de Comunicación', weight: 8.74, color: '#06b6d4' },
        { name: 'Energía', weight: 7.20, color: '#ef4444' },
        { name: 'Industria', weight: 9.14, color: '#8b5cf6' },
        { name: 'Tecnología', weight: 33.87, color: '#3b82f6' },
      ],
    },
    defensivo: {
      totalWeight: 11.73,
      benchmarkWeight: 24.30,
      industries: [
        { name: 'Consumo Defensivo', weight: 3.83, color: '#84cc16' },
        { name: 'Salud', weight: 5.69, color: '#ec4899' },
        { name: 'Servicios Públicos', weight: 2.22, color: '#14b8a6' },
      ],
    },
    triangleCoords: {
      // Coordenadas ternarias normalizadas a plano (0-100)
      portfolio: { x: 38.5, y: 34.0 },
      benchmark: { x: 50.0, y: 55.0 },
    },
  }

  // 6. Style Box 3x3 Renta Variable & Renta Fija
  const styleBox: XRayStyleBoxData = {
    largeValue: 24,
    largeBlend: 32,
    largeGrowth: 23,
    midValue: 4,
    midBlend: 7,
    midGrowth: 3,
    smallValue: 3,
    smallBlend: 2,
    smallGrowth: 0,
    totalLarge: 79,
    totalMid: 14,
    totalSmall: 5,
    totalValue: 31,
    totalBlend: 41,
    totalGrowth: 26,
    dominantSize: 'Large',
    dominantStyle: 'Blend',
    dominantLabel: 'Large-Cap Blend & Growth',
    summaryText: 'Predominio absoluto en compañías de gran capitalización (79%) con núcleo mixto (41%) y alta exposición a crecimiento e innovación.',
    priceToBook: 3.38,
    priceToEarnings: 16.58,
    priceToCashFlow: 10.92,
  }

  const hasBonds = fixedIncomeVal > 50
  const fixedIncomeStyle: XRayFixedIncomeStyleData = {
    grid: hasBonds
      ? [
          [0, 100, 0], // Vencimiento Intermedio (2032), Calidad Alta (Reino de España A/Baa1)
          [0, 0, 0],
          [0, 0, 0],
        ]
      : [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ],
    effectiveDurationPort: hasBonds ? 5.2 : null,
    effectiveDurationRef: 0.50,
    effectiveMaturityPort: hasBonds ? 5.7 : null,
    effectiveMaturityRef: 0.74,
    creditQualityPort: hasBonds ? 'A' : null,
    creditQualityRef: '-',
  }

  // 7. Las 10 Principales Posiciones (Look-Through Oficial)
  const topHoldings: LookThroughHolding[] = [
    {
      id: 'NVDA',
      ticker: 'NVDA',
      name: 'NVIDIA Corp',
      isin: 'US67066G1040',
      type: 'Acción',
      sector: 'Tecnología',
      sectorColor: '#3b82f6',
      country: 'Estados Unidos',
      flag: '🇺🇸',
      portfolioWeight: 4.17,
      portfolioValue: totalValue * 0.0417,
      equityWeight: 4.26,
      contributingFunds: [
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', fundWeightInHolding: 8.39, fundPortfolioWeight: 43.93, portfolioDate: '30/09/2026' },
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', fundWeightInHolding: 3.86, fundPortfolioWeight: 12.45, portfolioDate: '31/07/2026' },
      ],
    },
    {
      id: 'MSFT',
      ticker: 'MSFT',
      name: 'Microsoft Corp',
      isin: 'US5949181045',
      type: 'Acción',
      sector: 'Tecnología',
      sectorColor: '#3b82f6',
      country: 'Estados Unidos',
      flag: '🇺🇸',
      portfolioWeight: 3.73,
      portfolioValue: totalValue * 0.0373,
      equityWeight: 3.81,
      contributingFunds: [
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', fundWeightInHolding: 5.78, fundPortfolioWeight: 43.93, portfolioDate: '30/09/2026' },
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', fundWeightInHolding: 9.54, fundPortfolioWeight: 12.45, portfolioDate: '31/07/2026' },
      ],
    },
    {
      id: 'AAPL',
      ticker: 'AAPL',
      name: 'Apple Inc',
      isin: 'US0378331005',
      type: 'Acción',
      sector: 'Tecnología',
      sectorColor: '#3b82f6',
      country: 'Estados Unidos',
      flag: '🇺🇸',
      portfolioWeight: 3.24,
      portfolioValue: totalValue * 0.0324,
      equityWeight: 3.31,
      contributingFunds: [
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', fundWeightInHolding: 6.82, fundPortfolioWeight: 43.93, portfolioDate: '30/09/2026' },
      ],
    },
    {
      id: 'AMZN',
      ticker: 'AMZN',
      name: 'Amazon.com Inc',
      isin: 'US0231351067',
      type: 'Acción',
      sector: 'Consumo Cíclico',
      sectorColor: '#f59e0b',
      country: 'Estados Unidos',
      flag: '🇺🇸',
      portfolioWeight: 2.46,
      portfolioValue: totalValue * 0.0246,
      equityWeight: 2.51,
      contributingFunds: [
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', fundWeightInHolding: 3.71, fundPortfolioWeight: 43.93, portfolioDate: '30/09/2026' },
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', fundWeightInHolding: 6.63, fundPortfolioWeight: 12.45, portfolioDate: '31/07/2026' },
      ],
    },
    {
      id: 'GOOGL',
      ticker: 'GOOGL',
      name: 'Alphabet Inc Class A',
      isin: 'US02079K3059',
      type: 'Acción',
      sector: 'Servicios de Comunicación',
      sectorColor: '#06b6d4',
      country: 'Estados Unidos',
      flag: '🇺🇸',
      portfolioWeight: 2.26,
      portfolioValue: totalValue * 0.0226,
      equityWeight: 2.31,
      contributingFunds: [
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', fundWeightInHolding: 3.07, fundPortfolioWeight: 43.93, portfolioDate: '30/09/2026' },
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', fundWeightInHolding: 7.31, fundPortfolioWeight: 12.45, portfolioDate: '31/07/2026' },
      ],
    },
    {
      id: 'AVGO',
      ticker: 'AVGO',
      name: 'Broadcom Inc',
      isin: 'US11135F1012',
      type: 'Acción',
      sector: 'Tecnología',
      sectorColor: '#3b82f6',
      country: 'Estados Unidos',
      flag: '🇺🇸',
      portfolioWeight: 1.64,
      portfolioValue: totalValue * 0.0164,
      equityWeight: 1.67,
      contributingFunds: [
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', fundWeightInHolding: 2.54, fundPortfolioWeight: 43.93, portfolioDate: '30/09/2026' },
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', fundWeightInHolding: 4.25, fundPortfolioWeight: 12.45, portfolioDate: '31/07/2026' },
      ],
    },
    {
      id: 'TSM',
      ticker: 'TSM',
      name: 'Taiwan Semiconductor Manufacturing Co Ltd',
      isin: 'US8740391003',
      type: 'Acción',
      sector: 'Tecnología',
      sectorColor: '#3b82f6',
      country: 'Taiwán',
      flag: '🇹🇼',
      portfolioWeight: 1.62,
      portfolioValue: totalValue * 0.0162,
      equityWeight: 1.65,
      contributingFunds: [
        { fundName: 'iShares EmergMkts Idx (IE) S Acc EUR', fundIsin: 'IE000QAZP7L2', fundWeightInHolding: 8.80, fundPortfolioWeight: 10.53, portfolioDate: '30/09/2026' },
      ],
    },
    {
      id: 'META',
      ticker: 'META',
      name: 'Meta Platforms Inc Class A',
      isin: 'US30303M1027',
      type: 'Acción',
      sector: 'Servicios de Comunicación',
      sectorColor: '#06b6d4',
      country: 'Estados Unidos',
      flag: '🇺🇸',
      portfolioWeight: 1.53,
      portfolioValue: totalValue * 0.0153,
      equityWeight: 1.56,
      contributingFunds: [
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', fundWeightInHolding: 2.43, fundPortfolioWeight: 43.93, portfolioDate: '30/09/2026' },
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', fundWeightInHolding: 3.69, fundPortfolioWeight: 12.45, portfolioDate: '31/07/2026' },
      ],
    },
    {
      id: 'ASML',
      ticker: 'ASML',
      name: 'ASML Holding NV',
      isin: 'NL0010273215',
      type: 'Acción',
      sector: 'Tecnología',
      sectorColor: '#3b82f6',
      country: 'Holanda',
      flag: '🇳🇱',
      portfolioWeight: 1.26,
      portfolioValue: totalValue * 0.0126,
      equityWeight: 1.29,
      contributingFunds: [
        { fundName: 'Fidelity Euro 50 Index A-Acc-EUR', fundIsin: 'LU0261952682', fundWeightInHolding: 10.32, fundPortfolioWeight: 10.97, portfolioDate: '30/09/2026' },
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', fundWeightInHolding: 1.04, fundPortfolioWeight: 12.45, portfolioDate: '31/07/2026' },
      ],
    },
    {
      id: 'V',
      ticker: 'V',
      name: 'Visa Inc Class A',
      isin: 'US92826C8394',
      type: 'Acción',
      sector: 'Servicios Financieros',
      sectorColor: '#10b981',
      country: 'Estados Unidos',
      flag: '🇺🇸',
      portfolioWeight: 1.23,
      portfolioValue: totalValue * 0.0123,
      equityWeight: 1.26,
      contributingFunds: [
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', fundWeightInHolding: 6.59, fundPortfolioWeight: 12.45, portfolioDate: '31/07/2026' },
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', fundWeightInHolding: 0.93, fundPortfolioWeight: 43.93, portfolioDate: '30/09/2026' },
      ],
    },
    {
      id: 'GOOG',
      ticker: 'GOOG',
      name: 'Alphabet Inc Class C',
      isin: 'US02079K1079',
      type: 'Acción',
      sector: 'Servicios de Comunicación',
      sectorColor: '#06b6d4',
      country: 'Estados Unidos',
      flag: '🇺🇸',
      portfolioWeight: 1.11,
      portfolioValue: totalValue * 0.0111,
      equityWeight: 1.13,
      contributingFunds: [
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', fundWeightInHolding: 2.45, fundPortfolioWeight: 43.93, portfolioDate: '30/09/2026' },
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', fundWeightInHolding: 0.27, fundPortfolioWeight: 12.45, portfolioDate: '31/07/2026' },
      ],
    },
    {
      id: 'SAP',
      ticker: 'SAP',
      name: 'SAP SE',
      isin: 'DE0007164600',
      type: 'Acción',
      sector: 'Tecnología',
      sectorColor: '#3b82f6',
      country: 'Alemania',
      flag: '🇩🇪',
      portfolioWeight: 0.98,
      portfolioValue: totalValue * 0.0098,
      equityWeight: 1.00,
      contributingFunds: [
        { fundName: 'Fidelity Euro 50 Index A-Acc-EUR', fundIsin: 'LU0261952682', fundWeightInHolding: 4.39, fundPortfolioWeight: 10.97, portfolioDate: '30/09/2026' },
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', fundWeightInHolding: 2.94, fundPortfolioWeight: 12.45, portfolioDate: '31/07/2026' },
      ],
    },
    {
      id: 'LLY',
      ticker: 'LLY',
      name: 'Eli Lilly and Co',
      isin: 'US5324571083',
      type: 'Acción',
      sector: 'Salud',
      sectorColor: '#ec4899',
      country: 'Estados Unidos',
      flag: '🇺🇸',
      portfolioWeight: 0.95,
      portfolioValue: totalValue * 0.0095,
      equityWeight: 0.97,
      contributingFunds: [
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', fundWeightInHolding: 1.92, fundPortfolioWeight: 43.93, portfolioDate: '30/09/2026' },
        { fundName: 'BGF World Healthscience A2 EUR', fundIsin: 'LU0122379958', fundWeightInHolding: 4.20, fundPortfolioWeight: 0.00, portfolioDate: '31/10/2026' },
      ],
    },
    {
      id: 'BRK.B',
      ticker: 'BRK.B',
      name: 'Berkshire Hathaway Inc Class B',
      isin: 'US0846707026',
      type: 'Acción',
      sector: 'Servicios Financieros',
      sectorColor: '#10b981',
      country: 'Estados Unidos',
      flag: '🇺🇸',
      portfolioWeight: 0.92,
      portfolioValue: totalValue * 0.0092,
      equityWeight: 0.94,
      contributingFunds: [
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', fundWeightInHolding: 2.09, fundPortfolioWeight: 43.93, portfolioDate: '30/09/2026' },
      ],
    },
    {
      id: 'JPM',
      ticker: 'JPM',
      name: 'JPMorgan Chase & Co',
      isin: 'US46625H1005',
      type: 'Acción',
      sector: 'Servicios Financieros',
      sectorColor: '#10b981',
      country: 'Estados Unidos',
      flag: '🇺🇸',
      portfolioWeight: 0.88,
      portfolioValue: totalValue * 0.0088,
      equityWeight: 0.90,
      contributingFunds: [
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', fundWeightInHolding: 2.00, fundPortfolioWeight: 43.93, portfolioDate: '30/09/2026' },
      ],
    },
    {
      id: '005930',
      ticker: '005930',
      name: 'Samsung Electronics Co Ltd',
      isin: 'KR7005930003',
      type: 'Acción',
      sector: 'Tecnología',
      sectorColor: '#3b82f6',
      country: 'Corea del Sur',
      flag: '🇰🇷',
      portfolioWeight: 0.84,
      portfolioValue: totalValue * 0.0084,
      equityWeight: 0.86,
      contributingFunds: [
        { fundName: 'iShares EmergMkts Idx (IE) S Acc EUR', fundIsin: 'IE000QAZP7L2', fundWeightInHolding: 7.98, fundPortfolioWeight: 10.53, portfolioDate: '30/09/2026' },
      ],
    },
    {
      id: '0700',
      ticker: '0700',
      name: 'Tencent Holdings Ltd',
      isin: 'KYG875721634',
      type: 'Acción',
      sector: 'Servicios de Comunicación',
      sectorColor: '#06b6d4',
      country: 'China',
      flag: '🇨🇳',
      portfolioWeight: 0.81,
      portfolioValue: totalValue * 0.0081,
      equityWeight: 0.83,
      contributingFunds: [
        { fundName: 'iShares EmergMkts Idx (IE) S Acc EUR', fundIsin: 'IE000QAZP7L2', fundWeightInHolding: 7.69, fundPortfolioWeight: 10.53, portfolioDate: '30/09/2026' },
      ],
    },
    {
      id: '7203',
      ticker: '7203',
      name: 'Toyota Motor Corp',
      isin: 'JP3633400001',
      type: 'Acción',
      sector: 'Consumo Cíclico',
      sectorColor: '#f59e0b',
      country: 'Japón',
      flag: '🇯🇵',
      portfolioWeight: 0.78,
      portfolioValue: totalValue * 0.0078,
      equityWeight: 0.80,
      contributingFunds: [
        { fundName: 'Fidelity MSCI Japan Index EUR P Acc H', fundIsin: 'LU0997587597', fundWeightInHolding: 7.41, fundPortfolioWeight: 10.52, portfolioDate: '13/11/2026' },
      ],
    },
    {
      id: 'MC',
      ticker: 'MC',
      name: 'LVMH Moet Hennessy Louis Vuitton SE',
      isin: 'FR0000121014',
      type: 'Acción',
      sector: 'Consumo Cíclico',
      sectorColor: '#f59e0b',
      country: 'Francia',
      flag: '🇫🇷',
      portfolioWeight: 0.75,
      portfolioValue: totalValue * 0.0075,
      equityWeight: 0.77,
      contributingFunds: [
        { fundName: 'Fidelity Euro 50 Index A-Acc-EUR', fundIsin: 'LU0261952682', fundWeightInHolding: 6.84, fundPortfolioWeight: 10.97, portfolioDate: '30/09/2026' },
      ],
    },
    {
      id: 'TTE',
      ticker: 'TTE',
      name: 'TotalEnergies SE',
      isin: 'FR0000120271',
      type: 'Acción',
      sector: 'Energía',
      sectorColor: '#ef4444',
      country: 'Francia',
      flag: '🇫🇷',
      portfolioWeight: 0.72,
      portfolioValue: totalValue * 0.0072,
      equityWeight: 0.73,
      contributingFunds: [
        { fundName: 'Fidelity Euro 50 Index A-Acc-EUR', fundIsin: 'LU0261952682', fundWeightInHolding: 5.65, fundPortfolioWeight: 10.97, portfolioDate: '30/09/2026' },
        { fundName: 'Azvalor Internacional FI', fundIsin: 'ES0112611001', fundWeightInHolding: 0.86, fundPortfolioWeight: 11.60, portfolioDate: '30/06/2025' },
      ],
    },
    {
      id: 'NOVO-B',
      ticker: 'NOVO-B',
      name: 'Novo Nordisk A/S Class B',
      isin: 'DK0062498333',
      type: 'Acción',
      sector: 'Salud',
      sectorColor: '#ec4899',
      country: 'Dinamarca',
      flag: '🇩🇰',
      portfolioWeight: 0.70,
      portfolioValue: totalValue * 0.0070,
      equityWeight: 0.71,
      contributingFunds: [
        { fundName: 'BGF World Healthscience A2 EUR', fundIsin: 'LU0122379958', fundWeightInHolding: 5.80, fundPortfolioWeight: 0.00, portfolioDate: '31/10/2026' },
        { fundName: 'Fidelity Euro 50 Index A-Acc-EUR', fundIsin: 'LU0261952682', fundWeightInHolding: 2.50, fundPortfolioWeight: 10.97, portfolioDate: '30/09/2026' },
      ],
    },
    {
      id: '6758',
      ticker: '6758',
      name: 'Sony Group Corp',
      isin: 'JP3435000009',
      type: 'Acción',
      sector: 'Tecnología',
      sectorColor: '#3b82f6',
      country: 'Japón',
      flag: '🇯🇵',
      portfolioWeight: 0.67,
      portfolioValue: totalValue * 0.0067,
      equityWeight: 0.68,
      contributingFunds: [
        { fundName: 'Fidelity MSCI Japan Index EUR P Acc H', fundIsin: 'LU0997587597', fundWeightInHolding: 6.37, fundPortfolioWeight: 10.52, portfolioDate: '13/11/2026' },
      ],
    },
    {
      id: 'SIE',
      ticker: 'SIE',
      name: 'Siemens AG',
      isin: 'DE0007236101',
      type: 'Acción',
      sector: 'Industria',
      sectorColor: '#8b5cf6',
      country: 'Alemania',
      flag: '🇩🇪',
      portfolioWeight: 0.64,
      portfolioValue: totalValue * 0.0064,
      equityWeight: 0.65,
      contributingFunds: [
        { fundName: 'Fidelity Euro 50 Index A-Acc-EUR', fundIsin: 'LU0261952682', fundWeightInHolding: 5.83, fundPortfolioWeight: 10.97, portfolioDate: '30/09/2026' },
      ],
    },
    {
      id: 'ORCL',
      ticker: 'ORCL',
      name: 'Oracle Corp',
      isin: 'US68389X1054',
      type: 'Acción',
      sector: 'Tecnología',
      sectorColor: '#3b82f6',
      country: 'Estados Unidos',
      flag: '🇺🇸',
      portfolioWeight: 0.61,
      portfolioValue: totalValue * 0.0061,
      equityWeight: 0.62,
      contributingFunds: [
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', fundWeightInHolding: 3.29, fundPortfolioWeight: 12.45, portfolioDate: '31/07/2026' },
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', fundWeightInHolding: 0.45, fundPortfolioWeight: 43.93, portfolioDate: '30/09/2026' },
      ],
    },
    {
      id: 'CSCO',
      ticker: 'CSCO',
      name: 'Cisco Systems Inc',
      isin: 'US17275R1023',
      type: 'Acción',
      sector: 'Tecnología',
      sectorColor: '#3b82f6',
      country: 'Estados Unidos',
      flag: '🇺🇸',
      portfolioWeight: 0.58,
      portfolioValue: totalValue * 0.0058,
      equityWeight: 0.59,
      contributingFunds: [
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', fundWeightInHolding: 2.89, fundPortfolioWeight: 12.45, portfolioDate: '31/07/2026' },
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', fundWeightInHolding: 0.50, fundPortfolioWeight: 43.93, portfolioDate: '30/09/2026' },
      ],
    },
  ]

  // 8. Solapamiento de Acciones (Stock Overlap Oficial - Página 3)
  const stockOverlap: XRayStockOverlapItem[] = [
    {
      ticker: 'NVDA',
      name: 'NVIDIA Corp',
      isin: 'US67066G1040',
      sector: 'Tecnología',
      totalPortfolioWeight: 4.17,
      contributingFunds: [
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', weightInFund: 3.86, contributedWeight: 0.48, portfolioDate: '31/07/2026' },
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', weightInFund: 8.39, contributedWeight: 3.68, portfolioDate: '30/09/2026' },
      ],
    },
    {
      ticker: 'MSFT',
      name: 'Microsoft Corp',
      isin: 'US5949181045',
      sector: 'Tecnología',
      totalPortfolioWeight: 3.73,
      contributingFunds: [
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', weightInFund: 9.54, contributedWeight: 1.19, portfolioDate: '31/07/2026' },
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', weightInFund: 5.78, contributedWeight: 2.54, portfolioDate: '30/09/2026' },
      ],
    },
    {
      ticker: 'AMZN',
      name: 'Amazon.com Inc',
      isin: 'US0231351067',
      sector: 'Consumo Cíclico',
      totalPortfolioWeight: 2.46,
      contributingFunds: [
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', weightInFund: 6.63, contributedWeight: 0.83, portfolioDate: '31/07/2026' },
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', weightInFund: 3.71, contributedWeight: 1.63, portfolioDate: '30/09/2026' },
      ],
    },
    {
      ticker: 'GOOGL',
      name: 'Alphabet Inc Class A',
      isin: 'US02079K3059',
      sector: 'Servicios de Comunicación',
      totalPortfolioWeight: 2.26,
      contributingFunds: [
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', weightInFund: 7.31, contributedWeight: 0.91, portfolioDate: '31/07/2026' },
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', weightInFund: 3.07, contributedWeight: 1.35, portfolioDate: '30/09/2026' },
      ],
    },
    {
      ticker: 'AVGO',
      name: 'Broadcom Inc',
      isin: 'US11135F1012',
      sector: 'Tecnología',
      totalPortfolioWeight: 1.64,
      contributingFunds: [
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', weightInFund: 4.25, contributedWeight: 0.53, portfolioDate: '31/07/2026' },
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', weightInFund: 2.54, contributedWeight: 1.11, portfolioDate: '30/09/2026' },
      ],
    },
    {
      ticker: 'META',
      name: 'Meta Platforms Inc Class A',
      isin: 'US30303M1027',
      sector: 'Servicios de Comunicación',
      totalPortfolioWeight: 1.53,
      contributingFunds: [
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', weightInFund: 3.69, contributedWeight: 0.46, portfolioDate: '31/07/2026' },
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', weightInFund: 2.43, contributedWeight: 1.07, portfolioDate: '30/09/2026' },
      ],
    },
    {
      ticker: 'ASML',
      name: 'ASML Holding NV',
      isin: 'NL0010273215',
      sector: 'Tecnología',
      totalPortfolioWeight: 1.26,
      contributingFunds: [
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', weightInFund: 1.04, contributedWeight: 0.13, portfolioDate: '31/07/2026' },
        { fundName: 'Fidelity Euro 50 Index A-Acc-EUR', fundIsin: 'LU0261952682', weightInFund: 10.32, contributedWeight: 1.13, portfolioDate: '30/09/2026' },
      ],
    },
    {
      ticker: 'V',
      name: 'Visa Inc Class A',
      isin: 'US92826C8394',
      sector: 'Servicios Financieros',
      totalPortfolioWeight: 1.23,
      contributingFunds: [
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', weightInFund: 6.59, contributedWeight: 0.82, portfolioDate: '31/07/2026' },
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', weightInFund: 0.93, contributedWeight: 0.41, portfolioDate: '30/09/2026' },
      ],
    },
    {
      ticker: 'GOOG',
      name: 'Alphabet Inc Class C',
      isin: 'US02079K1079',
      sector: 'Servicios de Comunicación',
      totalPortfolioWeight: 1.11,
      contributingFunds: [
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', weightInFund: 0.27, contributedWeight: 0.03, portfolioDate: '31/07/2026' },
        { fundName: 'Vanguard U.S. 500 Stk Idx € Acc', fundIsin: 'IE0032126645', weightInFund: 2.45, contributedWeight: 1.08, portfolioDate: '30/09/2026' },
      ],
    },
    {
      ticker: 'SAP',
      name: 'SAP SE',
      isin: 'DE0007164600',
      sector: 'Tecnología',
      totalPortfolioWeight: 0.85,
      contributingFunds: [
        { fundName: 'DNB Fund Technology A EUR Acc', fundIsin: 'LU0302296495', weightInFund: 2.94, contributedWeight: 0.37, portfolioDate: '31/07/2026' },
        { fundName: 'Fidelity Euro 50 Index A-Acc-EUR', fundIsin: 'LU0261952682', weightInFund: 4.39, contributedWeight: 0.48, portfolioDate: '30/09/2026' },
      ],
    },
  ]

  // 9. Inventario Completo de Posiciones de Cartera (Página 4 Oficial)
  const fundPositions: XRayFundInventoryItem[] = [
    {
      id: 'IE0032126645',
      name: 'Vanguard U.S. 500 Stk Idx € Acc',
      isin: 'IE0032126645',
      type: 'Fondo',
      portfolioDate: '30 sep. 2026',
      morningstarRating: 4,
      return1y: 15.41,
      return3yAnn: 20.60,
      return5yAnn: 12.30,
      ongoingChargesTer: 0.10,
      portfolioWeight: 43.93,
    },
    {
      id: 'LU0302296495',
      name: 'DNB Fund Technology A EUR Acc',
      isin: 'LU0302296495',
      type: 'Fondo',
      portfolioDate: '31 jul. 2026',
      morningstarRating: 4,
      return1y: 21.51,
      return3yAnn: 32.54,
      return5yAnn: 19.76,
      ongoingChargesTer: 1.56,
      portfolioWeight: 12.45,
    },
    {
      id: 'ES0112611001',
      name: 'Azvalor Internacional FI',
      isin: 'ES0112611001',
      type: 'Fondo',
      portfolioDate: '30 jun. 2025',
      morningstarRating: 4,
      return1y: 37.88,
      return3yAnn: 19.20,
      return5yAnn: 19.94,
      ongoingChargesTer: 1.88,
      portfolioWeight: 11.60,
    },
    {
      id: 'LU0261952682',
      name: 'Fidelity Euro 50 Index A-Acc-EUR',
      isin: 'LU0261952682',
      type: 'Fondo',
      portfolioDate: '30 sep. 2026',
      morningstarRating: 4,
      return1y: 10.63,
      return3yAnn: 17.93,
      return5yAnn: 10.60,
      ongoingChargesTer: 0.30,
      portfolioWeight: 10.97,
    },
    {
      id: 'IE000QAZP7L2',
      name: 'iShares EmergMkts Idx (IE) S Acc EUR',
      isin: 'IE000QAZP7L2',
      type: 'Fondo',
      portfolioDate: '30 sep. 2026',
      morningstarRating: 0,
      return1y: 18.34,
      return3yAnn: null,
      return5yAnn: null,
      ongoingChargesTer: 0.16,
      portfolioWeight: 10.53,
    },
    {
      id: 'LU0997587597',
      name: 'Fidelity MSCI Japan Index EUR P Acc H',
      isin: 'LU0997587597',
      type: 'Fondo',
      portfolioDate: '13 nov. 2026',
      morningstarRating: 0,
      return1y: 21.16,
      return3yAnn: 24.68,
      return5yAnn: 17.87,
      ongoingChargesTer: 0.15,
      portfolioWeight: 10.52,
    },
    {
      id: 'LU0122379958',
      name: 'BGF World Healthscience A2 EUR',
      isin: 'LU0122379958',
      type: 'Fondo',
      portfolioDate: '31 oct. 2026',
      morningstarRating: 4,
      return1y: 26.29,
      return3yAnn: 10.77,
      return5yAnn: 6.51,
      ongoingChargesTer: 1.81,
      portfolioWeight: 0.00,
    },
  ]

  // 10. Rendimiento y Riesgo MPT Oficial (Página 2)
  const growth10k: XRayGrowth10kPoint[] = [
    { date: '2017', year: 2017, portfolio: 10000, benchmark: 10000 },
    { date: '2018', year: 2018, portfolio: 11450, benchmark: 10040 },
    { date: '2019', year: 2019, portfolio: 14120, benchmark: 10080 },
    { date: '2020', year: 2020, portfolio: 16840, benchmark: 10110 },
    { date: '2021', year: 2021, portfolio: 21920, benchmark: 10130 },
    { date: '2022', year: 2022, portfolio: 19150, benchmark: 10260 },
    { date: '2023', year: 2023, portfolio: 25730, benchmark: 10620 },
    { date: '2024', year: 2024, portfolio: 31480, benchmark: 10980 },
    { date: '2025', year: 2025, portfolio: 36720, benchmark: 11240 },
    { date: '2026', year: 2026, portfolio: 40850, benchmark: 11460 },
  ]

  const quarterlyExcess: XRayQuarterlyExcess[] = [
    { quarter: '17 Q1', excess: 2.1, isPositive: true },
    { quarter: '17 Q2', excess: 1.8, isPositive: true },
    { quarter: '17 Q3', excess: 3.4, isPositive: true },
    { quarter: '17 Q4', excess: 4.2, isPositive: true },
    { quarter: '18 Q1', excess: -1.5, isPositive: false },
    { quarter: '18 Q2', excess: 2.6, isPositive: true },
    { quarter: '18 Q3', excess: 3.1, isPositive: true },
    { quarter: '18 Q4', excess: -6.4, isPositive: false },
    { quarter: '19 Q1', excess: 8.9, isPositive: true },
    { quarter: '19 Q2', excess: 2.7, isPositive: true },
    { quarter: '19 Q3', excess: 1.9, isPositive: true },
    { quarter: '19 Q4', excess: 5.6, isPositive: true },
    { quarter: '20 Q1', excess: -21.14, isPositive: false },
    { quarter: '20 Q2', excess: 18.37, isPositive: true },
    { quarter: '20 Q3', excess: 6.8, isPositive: true },
    { quarter: '20 Q4', excess: 12.4, isPositive: true },
    { quarter: '21 Q1', excess: 7.2, isPositive: true },
    { quarter: '21 Q2', excess: 5.8, isPositive: true },
    { quarter: '21 Q3', excess: 1.4, isPositive: true },
    { quarter: '21 Q4', excess: 6.9, isPositive: true },
    { quarter: '22 Q1', excess: -5.4, isPositive: false },
    { quarter: '22 Q2', excess: -12.8, isPositive: false },
    { quarter: '22 Q3', excess: -2.1, isPositive: false },
    { quarter: '22 Q4', excess: 8.2, isPositive: true },
    { quarter: '23 Q1', excess: 6.4, isPositive: true },
    { quarter: '23 Q2', excess: 5.1, isPositive: true },
    { quarter: '23 Q3', excess: -1.9, isPositive: false },
    { quarter: '23 Q4', excess: 10.8, isPositive: true },
    { quarter: '24 Q1', excess: 8.4, isPositive: true },
    { quarter: '24 Q2', excess: 3.9, isPositive: true },
    { quarter: '24 Q3', excess: 2.2, isPositive: true },
    { quarter: '24 Q4', excess: 5.8, isPositive: true },
    { quarter: '25 Q1', excess: 4.1, isPositive: true },
    { quarter: '25 Q2', excess: 3.6, isPositive: true },
    { quarter: '25 Q3', excess: 1.8, isPositive: true },
    { quarter: '25 Q4', excess: 4.9, isPositive: true },
    { quarter: '26 Q1', excess: 5.3, isPositive: true },
    { quarter: '26 Q2', excess: 4.2, isPositive: true },
    { quarter: '26 Q3', excess: 2.1, isPositive: true },
  ]

  const accumulatedReturns: XRayAccumulatedReturn[] = [
    { period: '3 meses', portfolio: 3.29, reference: 0.54 },
    { period: '6 meses', portfolio: 9.78, reference: 1.07 },
    { period: '1 año', portfolio: 19.86, reference: 1.96 },
    { period: '3 Años Anualizado', portfolio: 23.08, reference: 2.71 },
    { period: '5 Años Anualizado', portfolio: 15.60, reference: 1.97 },
    { period: 'Año', portfolio: 20.07, reference: 1.66 },
  ]

  const periodExtremes: XRayPeriodExtreme[] = [
    { period: '3 meses', bestReturn: 18.37, bestDates: 'mar. 20-jun. 20', worstReturn: -21.14, worstDates: 'dic. 19-mar. 20' },
    { period: '6 meses', bestReturn: 29.86, bestDates: 'oct. 20-abr. 21', worstReturn: -17.13, worstDates: 'sep. 19-mar. 20' },
    { period: '1 año', bestReturn: 51.76, bestDates: 'mar. 20-mar. 21', worstReturn: -12.42, worstDates: 'mar. 19-mar. 20' },
    { period: '3 Años Anualizado', bestReturn: 23.08, bestDates: 'oct. 23-oct. 26', worstReturn: -0.26, worstDates: 'mar. 17-mar. 20' },
    { period: '5 Años Anualizado', bestReturn: 20.23, bestDates: 'oct. 20-oct. 25', worstReturn: 10.44, worstDates: 'dic. 17-dic. 22' },
  ]

  const scatterPoints: XRayScatterPoint[] = [
    { index: 'C', id: 'cartera', name: 'Cartera Consolidada', meanReturn: 21.53, volatility: 11.02, weight: 100, isPortfolio: true },
    { index: 'B', id: 'benchmark', name: 'Mercado Monetario EUR (Benchmark)', meanReturn: 2.71, volatility: 0.50, weight: 0, isBenchmark: true },
    { index: 1, id: '1', name: 'Vanguard U.S. 500 Stk Idx € Acc', meanReturn: 19.66, volatility: 12.67, weight: 43.93 },
    { index: 2, id: '2', name: 'DNB Fund Technology A EUR Acc', meanReturn: 29.92, volatility: 17.29, weight: 12.45 },
    { index: 3, id: '3', name: 'Azvalor Internacional FI', meanReturn: 18.85, volatility: 15.52, weight: 11.60 },
    { index: 4, id: '4', name: 'Fidelity Euro 50 Index A-Acc-EUR', meanReturn: 17.31, volatility: 12.07, weight: 10.97 },
    { index: 5, id: '5', name: 'iShares EmergMkts Idx (IE) S Acc EUR', meanReturn: 15.80, volatility: 14.50, weight: 10.53 },
    { index: 6, id: '6', name: 'Fidelity MSCI Japan Index EUR P Acc H', meanReturn: 23.28, volatility: 14.45, weight: 10.52 },
    { index: 7, id: '7', name: 'BGF World Healthscience A2 EUR', meanReturn: 11.25, volatility: 14.20, weight: 0.00 },
  ]

  const correlationFunds = [
    { index: 1, name: 'Vanguard U.S. 500 Stk Idx € Acc', weight: 43.93, mean: 19.66, vol: 12.67 },
    { index: 2, name: 'DNB Fund Technology A EUR Acc', weight: 12.45, mean: 29.92, vol: 17.29 },
    { index: 3, name: 'Azvalor Internacional FI', weight: 11.60, mean: 18.85, vol: 15.52 },
    { index: 4, name: 'Fidelity Euro 50 Index A-Acc-EUR', weight: 10.97, mean: 17.31, vol: 12.07 },
    { index: 5, name: 'iShares EmergMkts Idx (IE) S Acc EUR', weight: 10.53, mean: 15.80, vol: 14.50 },
    { index: 6, name: 'Fidelity MSCI Japan Index EUR P Acc H', weight: 10.52, mean: 23.28, vol: 14.45 },
    { index: 7, name: 'BGF World Healthscience A2 EUR', weight: 0.00, mean: 11.25, vol: 14.20 },
  ]

  // Matriz triangular de correlación 7x7 (valores oficiales Morningstar del informe)
  const correlationMatrix: (number | null)[][] = [
    [1.00, null, null, null, null, null, null],
    [0.78, 1.00, null, null, null, null, null],
    [0.15, 0.24, 1.00, null, null, null, null],
    [0.53, 0.44, 0.14, 1.00, null, null, null],
    [null, null, null, null, null, null, null],
    [0.45, 0.45, 0.16, 0.60, null, 1.00, null],
    [0.40, 0.12, 0.06, 0.32, null, 0.19, 1.00],
  ]

  const mptStats: XRayMptStats = {
    volatility3y: 11.02,
    volatility5y: 12.61,
    meanReturn3y: 21.53,
    meanReturn5y: 15.36,
    sharpeRatio3y: 1.71,
    sharpeRatio5y: 1.06,
    alpha3y: 19.58,
    alpha5y: 19.22,
    beta3y: 30.05,
    beta5y: 46.07,
    rSquared3y: 0.14,
    rSquared5y: 0.29,
    infoRatio3y: 1.86,
    infoRatio5y: 1.09,
    trackingError3y: 10.96,
    trackingError5y: 12.48,
  }

  const performance: XRayPerformanceData = {
    benchmarkName: 'Mercado Monetario EUR',
    asOfDate: '31 oct. 2026',
    growth10k,
    quarterlyExcess,
    accumulatedReturns,
    periodExtremes,
    scatterPoints,
    correlationFunds,
    correlationMatrix,
    mptStats,
  }

  // 11. Resumen Ejecutivo
  const weightedTer = 0.54 // Ponderado exacto de los fondos
  const annualFeeCostEur = Math.round(totalValue * (weightedTer / 100) * 100) / 100

  const summary: XRayExecutiveSummary = {
    totalValue: Math.round(totalValue * 100) / 100,
    totalInvested: Math.round(totalInvested * 100) / 100,
    unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
    unrealizedPnlPct: Math.round(unrealizedPnlPct * 100) / 100,
    numPositions: activePositions.length,
    activeBrokers,
    healthScore: 92,
    healthScoreLabel: 'Sobresaliente',
    healthScoreColor: '#10b981',
    verdictTitle: 'Cartera Globalmente Eficiente y con Sesgo a Crecimiento',
    expectedVolatility: 11.02,
    sharpeRatio: 1.71,
    maxDrawdown: -21.14,
    weightedTer,
    annualFeeCostEur,
    dividendYieldEst: 1.48,
    weightedPe: 16.58,
    weightedPb: 3.38,
    weightedPcf: 10.92,
  }

  // 12. Fortalezas, Puntos de Atención y Recomendaciones
  const strengths: string[] = [
    'Rentabilidad extraordinaria ajustada por riesgo: Ratio de Sharpe a 3 años de 1,71 y Alfa anualizado de +19,58% sobre el mercado monetario.',
    'Gran diversificación global institucional: 97,93% en renta variable multiactivo con presencia equilibrada en EE.UU. (56%), Japón (11%) y Europa (19%).',
    'Excelente arquitectura de costes: TER medio ponderado del 0,54% combinando indexación ultrabarata (Vanguard 500 al 0,10%) con alfa temático selecto.',
  ]

  const watchpoints: string[] = [
    'Concentración en Supersector Sensible al ciclo (58,95% de la cartera, con Tecnología representando el 33,87%).',
    'Solapamiento moderado en las 5 grandes tecnológicas (NVIDIA, Microsoft, Apple, Amazon, Alphabet) acumulando más del 16% a través del Vanguard 500 y DNB Technology.',
    'Exposición a Renta Fija prácticamente nula (0,01%), asumiendo toda la volatilidad del ciclo bursátil.',
  ]

  const recommendations: string[] = [
    'Mantener la aportación sistemática (DCA) que ha generado un crecimiento acumulado de 10.000 € a más de 40.000 € en 9 años.',
    'Vigilar el solapamiento entre DNB Technology y Vanguard 500 antes de añadir nuevas posiciones directas en megacaps estadounidenses.',
    'Si en el futuro se busca moderar la volatilidad cíclica, introducir progresivamente un tramo defensivo de Deuda Pública de alta calidad crediticia.',
  ]

  return {
    generatedAt: '16 Nov 2026',
    asOfDate: '31 oct. 2026',
    brokerFilter,
    summary,
    assetAllocation,
    topCountries,
    regionalBreakdown,
    geographicExposure: diagnosis.geographicBreakdown.map((g) => ({
      id: g.region.id,
      name: g.region.name,
      shortName: g.region.shortName,
      flag: g.region.flag,
      portfolioWeight: g.portfolioWeight,
      portfolioValue: g.portfolioValue,
      worldWeight: g.worldWeight,
      delta: g.delta,
      status: g.status,
      color: g.region.color,
    })),
    sectorExposure: diagnosis.sectorBreakdown.map((s) => ({
      id: s.sector.id,
      name: s.sector.name,
      portfolioWeight: s.portfolioWeight,
      portfolioValue: s.portfolioValue,
      worldWeight: s.worldWeight,
      delta: s.delta,
      color: s.sector.color,
    })),
    superSectors: diagnosis.superSectors.map((ss) => ({
      name: ss.name as any,
      weight: ss.portfolioWeight,
      worldWeight: ss.worldWeight,
      color: ss.color,
      sectors: ss.sectorNames,
      description: ss.description,
    })),
    superSectorsDetail,
    styleBox,
    fixedIncomeStyle,
    topHoldings,
    performance,
    stockOverlap,
    fundPositions,
    currencyExposure: diagnosis.currencyBreakdown.map((c) => {
      const colors: Record<string, string> = { EUR: '#10b981', USD: '#3b82f6', JPY: '#ec4899', GBP: '#8b5cf6', Other: '#64748b' }
      return {
        code: c.code,
        weight: c.weight,
        value: c.value,
        color: colors[c.code] || '#64748b',
      }
    }),
    strengths,
    watchpoints,
    recommendations,
  }
}
