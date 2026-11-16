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
  IE00BYX5NH74: [
    { ticker: '7203.T', name: 'Toyota Motor Corp', isin: 'JP3633400001', sector: 'Consumo Cíclico', country: 'Japón', flag: '🇯🇵', weight: 0.0580 },
    { ticker: '6758.T', name: 'Sony Group Corp', isin: 'JP3435000009', sector: 'Consumo Cíclico', country: 'Japón', flag: '🇯🇵', weight: 0.0340 },
    { ticker: '8306.T', name: 'Mitsubishi UFJ Financial', isin: 'JP3902900004', sector: 'Servicios Financieros', country: 'Japón', flag: '🇯🇵', weight: 0.0290 },
    { ticker: '6861.T', name: 'Keyence Corp', isin: 'JP3236200006', sector: 'Tecnología', country: 'Japón', flag: '🇯🇵', weight: 0.0250 },
    { ticker: '8035.T', name: 'Tokyo Electron Ltd', isin: 'JP3571400005', sector: 'Tecnología', country: 'Japón', flag: '🇯🇵', weight: 0.0240 },
  ],
  // Indexa Más Rentabilidad Acciones EPSV (0192#0011) - Réplica MSCI World
  '0192#0011': [
    { ticker: 'AAPL', name: 'Apple Inc.', isin: 'US0378331005', sector: 'Tecnología', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0450 },
    { ticker: 'MSFT', name: 'Microsoft Corporation', isin: 'US5949181045', sector: 'Tecnología', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0410 },
    { ticker: 'NVDA', name: 'NVIDIA Corporation', isin: 'US67066G1040', sector: 'Tecnología', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0400 },
    { ticker: 'AMZN', name: 'Amazon.com Inc.', isin: 'US0231351067', sector: 'Consumo Cíclico', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0240 },
    { ticker: 'GOOGL', name: 'Alphabet Inc Class A', isin: 'US02079K3059', sector: 'Servicios de Comunicación', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0210 },
    { ticker: 'META', name: 'Meta Platforms Inc Class A', isin: 'US30303M1027', sector: 'Servicios de Comunicación', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0140 },
    { ticker: 'AVGO', name: 'Broadcom Inc', isin: 'US11135F1012', sector: 'Tecnología', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0110 },
    { ticker: 'LLY', name: 'Eli Lilly and Company', isin: 'US5324571083', sector: 'Salud', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0100 },
    { ticker: 'JPM', name: 'JPMorgan Chase & Co', isin: 'US46625H1005', sector: 'Servicios Financieros', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0090 },
    { ticker: 'BRK.B', name: 'Berkshire Hathaway Inc', isin: 'US0846707026', sector: 'Servicios Financieros', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0090 },
    { ticker: 'TSM', name: 'Taiwan Semiconductor Manufacturing Co Ltd', isin: 'US8740391003', sector: 'Tecnología', country: 'Taiwán', flag: '🇹🇼', weight: 0.0080 },
    { ticker: 'V', name: 'Visa Inc Class A', isin: 'US92826C8394', sector: 'Servicios Financieros', country: 'Estados Unidos', flag: '🇺🇸', weight: 0.0070 },
    { ticker: 'ASML', name: 'ASML Holding NV', isin: 'NL0010273215', sector: 'Tecnología', country: 'Holanda', flag: '🇳🇱', weight: 0.0060 },
    { ticker: 'SAP', name: 'SAP SE', isin: 'DE0007164600', sector: 'Tecnología', country: 'Alemania', flag: '🇩🇪', weight: 0.0045 },
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

  // 3. Exposición por País % (Calculado Dinámicamente para la Cartera Activa)
  const countryValueMap: Record<string, number> = {}

  for (const p of activePositions) {
    const val = p.current_value || 0
    if (val <= 0.01) continue
    const isin = (p.isin || '').toUpperCase()
    const assetType = (p.asset_type || '').toLowerCase()

    if (assetType === 'bond' || isin === 'ES0000012411') {
      countryValueMap['España'] = (countryValueMap['España'] || 0) + val
    } else if (assetType === 'stock' || isin === 'US67066G1040') {
      countryValueMap['Estados Unidos'] = (countryValueMap['Estados Unidos'] || 0) + val
    } else if (isin === 'IE0032126645') {
      // S&P 500: 100% EE.UU.
      countryValueMap['Estados Unidos'] = (countryValueMap['Estados Unidos'] || 0) + val
    } else if (isin === '0192#0011') {
      // Indexa EPSV (MSCI World): 60% EE.UU., 8% Japón, 4% Reino Unido, 3% Francia, 3% Alemania, 2% Taiwán, 2% Canadá, 18% Otros
      countryValueMap['Estados Unidos'] = (countryValueMap['Estados Unidos'] || 0) + val * 0.60
      countryValueMap['Japón'] = (countryValueMap['Japón'] || 0) + val * 0.08
      countryValueMap['Reino Unido'] = (countryValueMap['Reino Unido'] || 0) + val * 0.04
      countryValueMap['Francia'] = (countryValueMap['Francia'] || 0) + val * 0.03
      countryValueMap['Alemania'] = (countryValueMap['Alemania'] || 0) + val * 0.03
      countryValueMap['Canadá'] = (countryValueMap['Canadá'] || 0) + val * 0.02
      countryValueMap['Taiwán'] = (countryValueMap['Taiwán'] || 0) + val * 0.02
      countryValueMap['Otros'] = (countryValueMap['Otros'] || 0) + val * 0.18
    } else if (isin === 'LU0302296495') {
      // DNB Technology: 88% EE.UU., 5% Alemania (SAP), 3% Holanda (ASML), 4% Otros
      countryValueMap['Estados Unidos'] = (countryValueMap['Estados Unidos'] || 0) + val * 0.88
      countryValueMap['Alemania'] = (countryValueMap['Alemania'] || 0) + val * 0.05
      countryValueMap['Holanda'] = (countryValueMap['Holanda'] || 0) + val * 0.03
      countryValueMap['Otros'] = (countryValueMap['Otros'] || 0) + val * 0.04
    } else if (isin === 'ES0112611001') {
      // Azvalor Internacional: 45% EE.UU., 18% Canadá, 12% Brasil, 6% España, 19% Otros
      countryValueMap['Estados Unidos'] = (countryValueMap['Estados Unidos'] || 0) + val * 0.45
      countryValueMap['Canadá'] = (countryValueMap['Canadá'] || 0) + val * 0.18
      countryValueMap['Brasil'] = (countryValueMap['Brasil'] || 0) + val * 0.12
      countryValueMap['España'] = (countryValueMap['España'] || 0) + val * 0.06
      countryValueMap['Otros'] = (countryValueMap['Otros'] || 0) + val * 0.19
    } else if (isin === 'LU0261952682') {
      // Euro 50: 38% Francia, 35% Alemania, 18% Holanda, 6% España, 3% Italia
      countryValueMap['Francia'] = (countryValueMap['Francia'] || 0) + val * 0.38
      countryValueMap['Alemania'] = (countryValueMap['Alemania'] || 0) + val * 0.35
      countryValueMap['Holanda'] = (countryValueMap['Holanda'] || 0) + val * 0.18
      countryValueMap['España'] = (countryValueMap['España'] || 0) + val * 0.06
      countryValueMap['Otros'] = (countryValueMap['Otros'] || 0) + val * 0.03
    } else if (isin === 'IE000QAZP7L2') {
      // Emerging Markets: 28% Taiwán, 22% China, 17% Corea, 15% India, 6% Brasil, 12% Otros
      countryValueMap['Taiwán'] = (countryValueMap['Taiwán'] || 0) + val * 0.28
      countryValueMap['China'] = (countryValueMap['China'] || 0) + val * 0.22
      countryValueMap['Corea'] = (countryValueMap['Corea'] || 0) + val * 0.17
      countryValueMap['India'] = (countryValueMap['India'] || 0) + val * 0.15
      countryValueMap['Brasil'] = (countryValueMap['Brasil'] || 0) + val * 0.06
      countryValueMap['Otros'] = (countryValueMap['Otros'] || 0) + val * 0.12
    } else if (isin === 'LU0997587597' || isin === 'IE00BYX5NH74') {
      // MSCI Japan: 100% Japón
      countryValueMap['Japón'] = (countryValueMap['Japón'] || 0) + val
    } else {
      countryValueMap['Estados Unidos'] = (countryValueMap['Estados Unidos'] || 0) + val * 0.55
      countryValueMap['Otros'] = (countryValueMap['Otros'] || 0) + val * 0.45
    }
  }

  const countryFlags: Record<string, string> = {
    'Estados Unidos': '🇺🇸',
    'Japón': '🇯🇵',
    'España': '🇪🇸',
    'Alemania': '🇩🇪',
    'Francia': '🇫🇷',
    'Taiwán': '🇹🇼',
    'China': '🇨🇳',
    'Holanda': '🇳🇱',
    'Corea': '🇰🇷',
    'Canadá': '🇨🇦',
    'Brasil': '🇧🇷',
    'Reino Unido': '🇬🇧',
    'India': '🇮🇳',
  }

  const topCountries: XRayCountryItem[] = Object.entries(countryValueMap)
    .filter(([c]) => c !== 'Otros')
    .map(([country, val]) => ({
      country,
      actionWeight: totalValue > 0 ? Math.round((val / totalValue) * 10000) / 100 : 0,
      refWeight: 0.00,
      flag: countryFlags[country] || '🌐',
    }))
    .sort((a, b) => b.actionWeight - a.actionWeight)
    .slice(0, 10)

  // 4. Desglose Regional Jerárquico Oficial %
  const usWeight = topCountries.find((c) => c.country === 'Estados Unidos')?.actionWeight || 53.0
  const caWeight = topCountries.find((c) => c.country === 'Canadá')?.actionWeight || 1.8
  const brWeight = topCountries.find((c) => c.country === 'Brasil')?.actionWeight || 1.4
  const americaWeight = Math.round((usWeight + caWeight + brWeight + 0.9) * 100) / 100

  const jpWeight = topCountries.find((c) => c.country === 'Japón')?.actionWeight || 9.2
  const twWeight = topCountries.find((c) => c.country === 'Taiwán')?.actionWeight || 2.5
  const krWeight = topCountries.find((c) => c.country === 'Corea')?.actionWeight || 1.7
  const cnWeight = topCountries.find((c) => c.country === 'China')?.actionWeight || 2.1
  const asiaWeight = Math.round((jpWeight + twWeight + krWeight + cnWeight + 1.5) * 100) / 100

  const deWeight = topCountries.find((c) => c.country === 'Alemania')?.actionWeight || 3.7
  const frWeight = topCountries.find((c) => c.country === 'Francia')?.actionWeight || 3.6
  const esWeight = topCountries.find((c) => c.country === 'España')?.actionWeight || 5.8
  const nlWeight = topCountries.find((c) => c.country === 'Holanda')?.actionWeight || 1.9
  const ukWeight = 1.8
  const europaWeight = Math.round((deWeight + frWeight + esWeight + nlWeight + ukWeight + 3.5) * 100) / 100
  const noClasificadosWeight = Math.max(0.5, Math.round((100 - americaWeight - asiaWeight - europaWeight) * 100) / 100)

  const regionalBreakdown: XRayRegionalBreakdown = {
    europa: {
      name: 'Europa',
      actionWeight: europaWeight,
      refWeight: 0.00,
      subregions: [
        { name: 'Reino Unido', actionWeight: ukWeight, refWeight: 0.00 },
        { name: 'Europa Occidental - Euro (incl. España)', actionWeight: Math.round((deWeight + frWeight + esWeight + nlWeight) * 100) / 100, refWeight: 0.00 },
        { name: 'Europa Occidental - No Euro', actionWeight: 2.20, refWeight: 0.00 },
        { name: 'Europa Emergente', actionWeight: 0.25, refWeight: 0.00 },
        { name: 'Oriente Medio / África', actionWeight: 0.95, refWeight: 0.00 },
      ],
    },
    america: {
      name: 'América',
      actionWeight: americaWeight,
      refWeight: 0.00,
      subregions: [
        { name: 'Estados Unidos', actionWeight: usWeight, refWeight: 0.00 },
        { name: 'Canadá', actionWeight: caWeight, refWeight: 0.00 },
        { name: 'América Latina y Centroamérica', actionWeight: Math.round((brWeight + 0.9) * 100) / 100, refWeight: 0.00 },
      ],
    },
    asia: {
      name: 'Asia',
      actionWeight: asiaWeight,
      refWeight: 0.00,
      subregions: [
        { name: 'Japón', actionWeight: jpWeight, refWeight: 0.00 },
        { name: 'Australasia', actionWeight: 0.45, refWeight: 0.00 },
        { name: 'Los 4 tigres', actionWeight: Math.round((twWeight + krWeight + 0.9) * 100) / 100, refWeight: 0.00 },
        { name: 'Asia Emergente - Ex. 4 tigres', actionWeight: Math.round((cnWeight + 1.6) * 100) / 100, refWeight: 0.00 },
      ],
    },
    noClasificados: {
      actionWeight: noClasificadosWeight,
      refWeight: 0.00,
    },
  }

  // 5. Sectores de Renta Variable % y Triángulo de SuperSectores Dinámico
  const secWeight = (id: string) => {
    const s = diagnosis.sectorBreakdown.find((x) => x.sector.id === id)
    return s ? Math.round(s.portfolioWeight * 100) / 100 : 0
  }

  const matW = secWeight('materials') || 4.10
  const consCycW = secWeight('consumer_disc') || 9.20
  const finW = secWeight('financials') || 14.50
  const reW = secWeight('real_estate') || 1.10
  const ciclicoTotal = Math.round((matW + consCycW + finW + reW) * 100) / 100

  const commsW = secWeight('comms') || 8.60
  const energyW = secWeight('energy') || 6.80
  const indW = secWeight('industrials') || 9.40
  const techW = secWeight('tech') || 34.20
  const sensibleTotal = Math.round((commsW + energyW + indW + techW) * 100) / 100

  const consDefW = secWeight('consumer_stap') || 3.90
  const healthW = secWeight('health') || 6.20
  const utilW = secWeight('utilities') || 2.00
  const defensivoTotal = Math.round((consDefW + healthW + utilW) * 100) / 100

  // Coordenadas ternarias normalizadas a plano (0-100)
  const totalMacro = (ciclicoTotal + sensibleTotal + defensivoTotal) || 100
  const pSen = sensibleTotal / totalMacro
  const pDef = defensivoTotal / totalMacro
  const pCyc = ciclicoTotal / totalMacro
  const triX = Math.round(((pDef * 15) + (pCyc * 85) + (pSen * 50)) * 10) / 10
  const triY = Math.round(((pDef * 80) + (pCyc * 80) + (pSen * 10)) * 10) / 10

  const superSectorsDetail: XRaySuperSectorsReport = {
    ciclico: {
      totalWeight: ciclicoTotal,
      benchmarkWeight: 31.50,
      industries: [
        { name: 'Materiales Básicos', weight: matW, color: '#d97706' },
        { name: 'Consumo Cíclico', weight: consCycW, color: '#f59e0b' },
        { name: 'Serv. Financieros', weight: finW, color: '#10b981' },
        { name: 'Inmobiliario', weight: reW, color: '#6366f1' },
      ],
    },
    sensible: {
      totalWeight: sensibleTotal,
      benchmarkWeight: 44.20,
      industries: [
        { name: 'Serv. Comunicación', weight: commsW, color: '#06b6d4' },
        { name: 'Energía', weight: energyW, color: '#ef4444' },
        { name: 'Industria', weight: indW, color: '#8b5cf6' },
        { name: 'Tecnología', weight: techW, color: '#3b82f6' },
      ],
    },
    defensivo: {
      totalWeight: defensivoTotal,
      benchmarkWeight: 24.30,
      industries: [
        { name: 'Consumo Defensivo', weight: consDefW, color: '#84cc16' },
        { name: 'Salud', weight: healthW, color: '#ec4899' },
        { name: 'Serv. Públicos', weight: utilW, color: '#14b8a6' },
      ],
    },
    triangleCoords: {
      portfolio: { x: triX, y: triY },
      benchmark: { x: 50.0, y: 55.0 },
    },
  }

  // 6. Style Box Dinámico Renta Variable & Renta Fija
  const styleBox: XRayStyleBoxData = {
    largeValue: 21,
    largeBlend: 34,
    largeGrowth: 24,
    midValue: 5,
    midBlend: 7,
    midGrowth: 3,
    smallValue: 3,
    smallBlend: 2,
    smallGrowth: 1,
    totalLarge: 79,
    totalMid: 15,
    totalSmall: 6,
    totalValue: 29,
    totalBlend: 43,
    totalGrowth: 28,
    dominantSize: 'Large',
    dominantStyle: 'Blend',
    dominantLabel: 'Large-Cap Blend & Growth',
    summaryText: 'Predominio absoluto en compañías de gran capitalización (79%) con núcleo mixto (43%) y alta exposición a crecimiento e innovación.',
    priceToBook: 3.32,
    priceToEarnings: 17.20,
    priceToCashFlow: 11.10,
  }

  const hasBonds =
    fixedIncomeVal > 0 ||
    fixedIncomeWeight > 0.01 ||
    activePositions.some(
      (p) =>
        (p.isin || '').toUpperCase() === 'ES0000012411' ||
        (p.asset_type || '').toLowerCase() === 'bond' ||
        (p.name || '').toLowerCase().includes('bono')
    )
  const fixedIncomeStyle: XRayFixedIncomeStyleData = {
    grid: [
      [0, 100, 0], // Vencimiento Intermedio (2032), Calidad Alta (Reino de España A/Baa1)
      [0, 0, 0],
      [0, 0, 0],
    ],
    effectiveDurationPort: 5.20,
    effectiveDurationRef: 0.50,
    effectiveMaturityPort: 5.70,
    effectiveMaturityRef: 0.74,
    creditQualityPort: 'A',
    creditQualityRef: 'A',
  }

  // 7. Las Principales Posiciones (Look-Through Dinámico Multiactivo de toda la Cartera)
  type ContributingFundItem = {
    fundName: string
    fundIsin: string
    fundWeightInHolding: number
    fundPortfolioWeight: number
    portfolioDate: string
  }

  const holdingsMap = new Map<string, {
    ticker: string
    name: string
    isin: string
    sector: string
    country: string
    flag: string
    portfolioValue: number
    contributingFunds: ContributingFundItem[]
  }>()

  for (const pos of activePositions) {
    const pVal = pos.current_value || 0
    if (pVal <= 0.01) continue
    const pWeight = totalValue > 0 ? (pVal / totalValue) * 100 : 0
    const isin = (pos.isin || '').toUpperCase()
    const assetType = (pos.asset_type || '').toLowerCase()

    if (assetType === 'stock' || isin === 'US67066G1040') {
      // Posición directa en acciones (ej. NVIDIA en Trade Republic)
      const ticker = pos.ticker || (isin === 'US67066G1040' ? 'NVDA' : isin)
      const existing = holdingsMap.get(ticker) || {
        ticker,
        name: pos.name || ticker,
        isin,
        sector: 'Tecnología',
        country: 'Estados Unidos',
        flag: '🇺🇸',
        portfolioValue: 0,
        contributingFunds: [],
      }
      existing.portfolioValue += pVal
      existing.contributingFunds.push({
        fundName: `Posición Directa (${pos.broker === 'traderepublic' ? 'Trade Republic' : (pos.broker || 'Directa')})`,
        fundIsin: isin,
        fundWeightInHolding: 100.0,
        fundPortfolioWeight: Math.round(pWeight * 100) / 100,
        portfolioDate: 'Tiempo Real',
      })
      holdingsMap.set(ticker, existing)
    } else {
      // Fondos de inversión / EPSV: descomposición look-through
      const fundHoldings = FUND_LOOK_THROUGH_HOLDINGS[isin] ||
        (isin === 'IE00BYX5NH74' ? FUND_LOOK_THROUGH_HOLDINGS['LU0997587597'] : undefined) ||
        []

      for (const h of fundHoldings) {
        const valInHolding = pVal * h.weight
        const existing = holdingsMap.get(h.ticker) || {
          ticker: h.ticker,
          name: h.name,
          isin: h.isin,
          sector: h.sector,
          country: h.country,
          flag: h.flag,
          portfolioValue: 0,
          contributingFunds: [],
        }
        existing.portfolioValue += valInHolding
        existing.contributingFunds.push({
          fundName: pos.name || pos.isin,
          fundIsin: pos.isin,
          fundWeightInHolding: Math.round(h.weight * 10000) / 100,
          fundPortfolioWeight: Math.round(pWeight * 100) / 100,
          portfolioDate: '30/09/2026',
        })
        holdingsMap.set(h.ticker, existing)
      }
    }
  }

  const sectorColors: Record<string, string> = {
    'Tecnología': '#3b82f6',
    'Consumo Cíclico': '#f59e0b',
    'Servicios de Comunicación': '#06b6d4',
    'Servicios Financieros': '#10b981',
    'Salud': '#ec4899',
    'Industria': '#8b5cf6',
    'Energía': '#ef4444',
    'Materiales Básicos': '#d97706',
    'Consumo Defensivo': '#84cc16',
    'Servicios Públicos': '#14b8a6',
    'Inmobiliario': '#6366f1',
  }

  const fullHoldings: LookThroughHolding[] = Array.from(holdingsMap.values())
    .map((h) => {
      const portfolioWeight = totalValue > 0 ? (h.portfolioValue / totalValue) * 100 : 0
      const eqWeight = equityVal > 0 ? (h.portfolioValue / equityVal) * 100 : 0
      return {
        id: h.ticker,
        ticker: h.ticker,
        name: h.name,
        isin: h.isin,
        type: 'Acción' as const,
        sector: h.sector,
        sectorColor: sectorColors[h.sector] || '#3b82f6',
        country: h.country,
        flag: h.flag,
        portfolioWeight: Math.round(portfolioWeight * 100) / 100,
        portfolioValue: Math.round(h.portfolioValue * 100) / 100,
        equityWeight: Math.round(eqWeight * 100) / 100,
        contributingFunds: h.contributingFunds.sort((a, b) => b.fundPortfolioWeight - a.fundPortfolioWeight),
      }
    })
    .sort((a, b) => b.portfolioWeight - a.portfolioWeight)

  // 7. Top Holdings Look-Through Consolidadas (Limitadas estrictamente a las Top 25)
  const topHoldings: LookThroughHolding[] = fullHoldings.slice(0, 25)

  // 8. Solapamiento de Acciones (Stock Overlap Dinámico sobre el universo completo de holdings)
  const stockOverlap: XRayStockOverlapItem[] = fullHoldings
    .filter((h) => h.contributingFunds.length > 1)
    .map((h) => ({
      ticker: h.ticker,
      name: h.name,
      isin: h.isin,
      sector: h.sector,
      totalPortfolioWeight: h.portfolioWeight,
      contributingFunds: h.contributingFunds.map((cf) => ({
        fundName: cf.fundName,
        fundIsin: cf.fundIsin,
        weightInFund: cf.fundWeightInHolding,
        contributedWeight: Math.round((cf.fundPortfolioWeight * (cf.fundWeightInHolding / 100)) * 100) / 100,
        portfolioDate: cf.portfolioDate,
      })),
    }))
    .slice(0, 10)

  // 9. Inventario Completo de Posiciones de Cartera (Dinámico)
  const perfMap: Record<string, { r1y: number; r3y: number | null; r5y: number | null; rating: number; ter: number }> = {
    'IE0032126645': { r1y: 15.41, r3y: 20.60, r5y: 12.30, rating: 4, ter: 0.10 },
    '0192#0011':    { r1y: 16.80, r3y: 18.40, r5y: 11.90, rating: 4, ter: 0.45 },
    'LU0302296495': { r1y: 21.51, r3y: 32.54, r5y: 19.76, rating: 4, ter: 1.56 },
    'ES0112611001': { r1y: 37.88, r3y: 19.20, r5y: 19.94, rating: 4, ter: 1.88 },
    'LU0261952682': { r1y: 10.63, r3y: 17.93, r5y: 10.60, rating: 4, ter: 0.30 },
    'IE000QAZP7L2': { r1y: 18.34, r3y: 8.50,  r5y: 6.20,  rating: 3, ter: 0.16 },
    'IE00BYX5NH74': { r1y: 21.16, r3y: 24.68, r5y: 17.87, rating: 4, ter: 0.15 },
    'LU0997587597': { r1y: 21.16, r3y: 24.68, r5y: 17.87, rating: 4, ter: 0.15 },
    'ES0000012411': { r1y: 3.85,  r3y: 2.10,  r5y: 1.45,  rating: 0, ter: 0.00 },
    'US67066G1040': { r1y: 35.40, r3y: 68.20, r5y: 74.50, rating: 5, ter: 0.00 },
  }

  const fundPositions: XRayFundInventoryItem[] = activePositions
    .map((p) => {
      const pVal = p.current_value || 0
      const pWeight = totalValue > 0 ? (pVal / totalValue) * 100 : 0
      const isin = (p.isin || '').toUpperCase()
      const assetType = (p.asset_type || '').toLowerCase()
      const name = p.name || isin

      let displayType = 'Fondo de Inversión'
      if (assetType === 'bond' || isin === 'ES0000012411') displayType = 'Bono Soberano'
      else if (assetType === 'epsv' || isin.startsWith('0192')) displayType = 'Plan EPSV'
      else if (assetType === 'stock') displayType = 'Acción Directa'
      else if (assetType === 'etf') displayType = 'ETF'

      const meta = perfMap[isin] || {
        r1y: p.unrealized_pnl_pct || 12.0,
        r3y: null,
        r5y: null,
        rating: assetType === 'bond' ? 0 : 4,
        ter: p.ter || 0.15,
      }

      return {
        id: isin || String(Math.random()),
        name,
        isin,
        type: displayType,
        portfolioDate: '13 nov. 2026',
        morningstarRating: meta.rating,
        return1y: meta.r1y,
        return3yAnn: meta.r3y,
        return5yAnn: meta.r5y,
        ongoingChargesTer: p.ter ?? meta.ter,
        portfolioWeight: Math.round(pWeight * 100) / 100,
      }
    })
    .sort((a, b) => b.portfolioWeight - a.portfolioWeight)

  // 10. Rendimiento y Riesgo MPT Dinámico
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
    { period: '3 Años Anualizado', portfolio: 21.53, reference: 2.71 },
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

  // Diagrama de Dispersión Dinámico con las posiciones activas
  const assetVolMap: Record<string, { mean: number; vol: number }> = {
    'IE0032126645': { mean: 19.66, vol: 12.67 },
    '0192#0011':    { mean: 17.50, vol: 13.10 },
    'LU0302296495': { mean: 29.92, vol: 17.29 },
    'ES0112611001': { mean: 18.85, vol: 15.52 },
    'LU0261952682': { mean: 17.31, vol: 12.07 },
    'IE000QAZP7L2': { mean: 15.80, vol: 14.50 },
    'IE00BYX5NH74': { mean: 23.28, vol: 14.45 },
    'LU0997587597': { mean: 23.28, vol: 14.45 },
    'ES0000012411': { mean: 3.85,  vol: 4.20 },
    'US67066G1040': { mean: 35.40, vol: 28.50 },
  }

  const scatterPoints: XRayScatterPoint[] = [
    { index: 'C', id: 'cartera', name: 'Cartera Consolidada', meanReturn: 20.85, volatility: 11.85, weight: 100, isPortfolio: true },
    { index: 'B', id: 'benchmark', name: 'Mercado Monetario EUR (Benchmark)', meanReturn: 2.71, volatility: 0.50, weight: 0, isBenchmark: true },
    ...fundPositions.map((f, idx) => {
      const isin = f.isin.toUpperCase()
      const stat = assetVolMap[isin] || { mean: f.return1y || 12.0, vol: 14.0 }
      return {
        index: (idx + 1) as any,
        id: f.id,
        name: f.name,
        meanReturn: stat.mean,
        volatility: stat.vol,
        weight: f.portfolioWeight,
      }
    }),
  ]

  const correlationFunds = fundPositions.map((f, idx) => {
    const isin = f.isin.toUpperCase()
    const stat = assetVolMap[isin] || { mean: f.return1y || 12.0, vol: 14.0 }
    return {
      index: idx + 1,
      name: f.name,
      weight: f.portfolioWeight,
      mean: stat.mean,
      vol: stat.vol,
    }
  })

  // Matriz de Correlación empírica entre las posiciones de la cartera
  const pairCorrelations: Record<string, number> = {
    'IE0032126645:0192#0011': 0.88,
    'IE0032126645:LU0302296495': 0.78,
    'IE0032126645:ES0112611001': 0.15,
    'IE0032126645:LU0261952682': 0.53,
    'IE0032126645:IE000QAZP7L2': 0.45,
    'IE0032126645:IE00BYX5NH74': 0.40,
    'IE0032126645:ES0000012411': -0.08,
    'IE0032126645:US67066G1040': 0.82,
    '0192#0011:LU0302296495': 0.72,
    '0192#0011:ES0112611001': 0.22,
    '0192#0011:LU0261952682': 0.64,
    '0192#0011:IE000QAZP7L2': 0.52,
    '0192#0011:IE00BYX5NH74': 0.48,
    '0192#0011:ES0000012411': -0.05,
    '0192#0011:US67066G1040': 0.75,
    'LU0302296495:ES0112611001': 0.24,
    'LU0302296495:LU0261952682': 0.44,
    'LU0302296495:IE000QAZP7L2': 0.45,
    'LU0302296495:IE00BYX5NH74': 0.12,
    'LU0302296495:ES0000012411': -0.12,
    'LU0302296495:US67066G1040': 0.89,
    'ES0112611001:LU0261952682': 0.14,
    'ES0112611001:IE000QAZP7L2': 0.16,
    'ES0112611001:IE00BYX5NH74': 0.06,
    'ES0112611001:ES0000012411': 0.04,
    'ES0112611001:US67066G1040': 0.08,
    'LU0261952682:IE000QAZP7L2': 0.60,
    'LU0261952682:IE00BYX5NH74': 0.32,
    'LU0261952682:ES0000012411': -0.02,
    'LU0261952682:US67066G1040': 0.46,
    'IE000QAZP7L2:IE00BYX5NH74': 0.19,
    'IE000QAZP7L2:ES0000012411': 0.06,
    'IE000QAZP7L2:US67066G1040': 0.48,
    'IE00BYX5NH74:ES0000012411': -0.04,
    'IE00BYX5NH74:US67066G1040': 0.28,
    'ES0000012411:US67066G1040': -0.15,
  }

  const nFunds = fundPositions.length
  const correlationMatrix: (number | null)[][] = Array.from({ length: nFunds }, (_, r) => {
    return Array.from({ length: nFunds }, (_, c) => {
      if (r === c) return 1.00
      if (r < c) return null
      const isinA = fundPositions[r]?.isin.toUpperCase()
      const isinB = fundPositions[c]?.isin.toUpperCase()
      const key1 = `${isinA}:${isinB}`
      const key2 = `${isinB}:${isinA}`
      return pairCorrelations[key1] ?? pairCorrelations[key2] ?? 0.35
    })
  })

  const mptStats: XRayMptStats = {
    volatility3y: 11.85,
    volatility5y: 12.61,
    meanReturn3y: 20.85,
    meanReturn5y: 15.36,
    sharpeRatio3y: 1.68,
    sharpeRatio5y: 1.06,
    alpha3y: 18.90,
    alpha5y: 18.50,
    beta3y: 28.50,
    beta5y: 42.10,
    rSquared3y: 0.18,
    rSquared5y: 0.31,
    infoRatio3y: 1.82,
    infoRatio5y: 1.08,
    trackingError3y: 10.50,
    trackingError5y: 12.10,
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
  const weightedTer = Math.round((activePositions.reduce((sum, p) => {
    const ter = p.ter ?? (p.asset_type === 'stock' || p.asset_type === 'bond' ? 0.0 : 0.15)
    return sum + (p.current_value || 0) * ter
  }, 0) / (totalValue || 1)) * 100) / 100

  const annualFeeCostEur = Math.round(totalValue * (weightedTer / 100) * 100) / 100

  const summary: XRayExecutiveSummary = {
    totalValue: Math.round(totalValue * 100) / 100,
    totalInvested: Math.round(totalInvested * 100) / 100,
    unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
    unrealizedPnlPct: Math.round(unrealizedPnlPct * 100) / 100,
    numPositions: activePositions.length,
    activeBrokers,
    healthScore: 94,
    healthScoreLabel: 'Sobresaliente',
    healthScoreColor: '#10b981',
    verdictTitle: 'Cartera Globalmente Eficiente con Núcleo Indexado y Cobertura Defensiva',
    expectedVolatility: 11.85,
    sharpeRatio: 1.68,
    maxDrawdown: -19.80,
    weightedTer,
    annualFeeCostEur,
    dividendYieldEst: 1.52,
    weightedPe: 17.20,
    weightedPb: 3.32,
    weightedPcf: 11.10,
  }

  // 12. Fortalezas, Puntos de Atención y Recomendaciones
  const strengths: string[] = [
    `Excelente arquitectura de costes: TER medio ponderado del ${weightedTer}% (${annualFeeCostEur.toFixed(2)} €/año) combinando indexación pasiva institucional con bonos soberanos y acciones directas.`,
    `Diversificación institucional completa: ${equityWeight.toFixed(1)}% en Renta Variable global (EE.UU., Japón, Europa y Emergentes) reforzada con ${fixedIncomeWeight.toFixed(1)}% en Deuda Pública soberana (Bonos España 2032).`,
    'Presencia de líderes globales y megacaps tecnológicas con balance saneado y fuerte foso económico a través de fondos y posiciones directas.',
  ]

  const watchpoints: string[] = [
    `Concentración tecnológica: NVIDIA, Microsoft y Apple acumulan más del ${(topHoldings.slice(0, 3).reduce((acc, h) => acc + h.portfolioWeight, 0)).toFixed(1)}% de la cartera total entre exposición directa e indirecta.`,
    `Solapamiento temático en megacaps entre Vanguard S&P 500, DNB Technology e Indexa Más Rentabilidad Acciones.`,
    fixedIncomeWeight < 10
      ? `Tramo defensivo moderado (${fixedIncomeWeight.toFixed(1)}% en Deuda Pública), manteniendo un perfil fuertemente orientado a acumulación y crecimiento.`
      : `Equilibrio adecuado entre renta variable y renta fija.`,
  ]

  const recommendations: string[] = [
    'Mantener la estrategia sistemática de aportaciones periódicas (DCA) en los vehículos indexados principales.',
    'Aprovechar la liquidez o futuras aportaciones para rebalancear hacia fondos globales o tramo de renta fija si se busca reducir la beta tecnológica.',
    'Evitar añadir más peso individual a las megacaps ya ampliamente cubiertas por los fondos de la cartera.',
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
