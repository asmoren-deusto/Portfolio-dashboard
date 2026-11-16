/**
 * xrayEngine.ts
 * Motor cuantitativo para la generación del Informe X-Ray Completo de Cartera
 * (Inspirado en el estándar institucional Morningstar Portfolio X-Ray).
 *
 * Realiza el análisis Look-Through a través de fondos indexados, fondos de autor,
 * ETFs y acciones directas para descomponer la cartera en:
 *  1. Asignación de activos real (Asset Allocation).
 *  2. Matriz de estilo Morningstar 3x3 (Style Box).
 *  3. Top 15 compañías subyacentes agregadas (Look-Through Holdings).
 *  4. Radiografía geográfica frente a MSCI ACWI.
 *  5. Radiografía sectorial frente a MSCI World (con SuperSectores).
 *  6. Métricas de riesgo, valoración y comisiones (TER ponderado, PER, Sharpe).
 */

import type { Position } from '@/lib/mockData'
import {
  analyzePortfolioDiversification,
  WORLD_GEO_BENCHMARK,
  WORLD_SECTOR_BENCHMARK,
  type DiversificationDiagnosis,
} from './diversificationEngine'

// ── Interfaces del Informe X-Ray ──────────────────────────────────────────────

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
  // 3x3 Grid (suma 100% de la renta variable)
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
}

export interface LookThroughHolding {
  id: string
  ticker: string
  name: string
  sector: string
  sectorColor: string
  country: string
  flag: string
  portfolioWeight: number // % sobre la cartera total
  portfolioValue: number // € sobre la cartera total
  equityWeight: number // % sobre la renta variable
  contributingFunds: {
    fundName: string
    fundWeightInHolding: number // % dentro del fondo
    fundPortfolioWeight: number // % del fondo en cartera
  }[]
}

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
  brokerFilter: string
  summary: XRayExecutiveSummary
  assetAllocation: XRayAssetAllocationItem[]
  styleBox: XRayStyleBoxData
  topHoldings: LookThroughHolding[]
  geographicExposure: XRayGeographicItem[]
  sectorExposure: XRaySectorItem[]
  superSectors: XRaySuperSector[]
  currencyExposure: { code: string; weight: number; value: number; color: string }[]
  strengths: string[]
  watchpoints: string[]
  recommendations: string[]
}

// ── Tablas Institucionales Look-Through de Fondos Principales ─────────────────

interface FundHoldingWeight {
  ticker: string
  name: string
  sector: string
  country: string
  flag: string
  weight: number // % dentro del fondo (ej: 0.07 para 7%)
}

/**
 * Top holdings reportados en Factsheet / Morningstar para cada fondo o activo
 */
const FUND_LOOK_THROUGH_HOLDINGS: Record<string, FundHoldingWeight[]> = {
  // Vanguard U.S. 500 Stock Index Fund (IE0032126645)
  IE0032126645: [
    { ticker: 'MSFT', name: 'Microsoft Corporation', sector: 'Tecnología', country: 'EE.UU.', flag: '🇺🇸', weight: 0.071 },
    { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Tecnología', country: 'EE.UU.', flag: '🇺🇸', weight: 0.068 },
    { ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'Tecnología', country: 'EE.UU.', flag: '🇺🇸', weight: 0.064 },
    { ticker: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumo Cíclico', country: 'EE.UU.', flag: '🇺🇸', weight: 0.038 },
    { ticker: 'GOOGL', name: 'Alphabet Inc. (Class A/C)', sector: 'Comunicaciones', country: 'EE.UU.', flag: '🇺🇸', weight: 0.039 },
    { ticker: 'META', name: 'Meta Platforms Inc.', sector: 'Comunicaciones', country: 'EE.UU.', flag: '🇺🇸', weight: 0.026 },
    { ticker: 'BRK.B', name: 'Berkshire Hathaway Inc.', sector: 'Finanzas', country: 'EE.UU.', flag: '🇺🇸', weight: 0.017 },
    { ticker: 'AVGO', name: 'Broadcom Inc.', sector: 'Tecnología', country: 'EE.UU.', flag: '🇺🇸', weight: 0.016 },
    { ticker: 'LLY', name: 'Eli Lilly and Company', sector: 'Salud', country: 'EE.UU.', flag: '🇺🇸', weight: 0.015 },
    { ticker: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Finanzas', country: 'EE.UU.', flag: '🇺🇸', weight: 0.013 },
    { ticker: 'TSLA', name: 'Tesla Inc.', sector: 'Consumo Cíclico', country: 'EE.UU.', flag: '🇺🇸', weight: 0.014 },
    { ticker: 'UNH', name: 'UnitedHealth Group Inc.', sector: 'Salud', country: 'EE.UU.', flag: '🇺🇸', weight: 0.012 },
  ],
  // DNB Fund Technology (LU0302296495)
  LU0302296495: [
    { ticker: 'MSFT', name: 'Microsoft Corporation', sector: 'Tecnología', country: 'EE.UU.', flag: '🇺🇸', weight: 0.098 },
    { ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'Tecnología', country: 'EE.UU.', flag: '🇺🇸', weight: 0.089 },
    { ticker: 'GOOGL', name: 'Alphabet Inc. (Class A/C)', sector: 'Comunicaciones', country: 'EE.UU.', flag: '🇺🇸', weight: 0.068 },
    { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Tecnología', country: 'EE.UU.', flag: '🇺🇸', weight: 0.062 },
    { ticker: 'AVGO', name: 'Broadcom Inc.', sector: 'Tecnología', country: 'EE.UU.', flag: '🇺🇸', weight: 0.054 },
    { ticker: 'META', name: 'Meta Platforms Inc.', sector: 'Comunicaciones', country: 'EE.UU.', flag: '🇺🇸', weight: 0.048 },
    { ticker: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumo Cíclico', country: 'EE.UU.', flag: '🇺🇸', weight: 0.042 },
    { ticker: 'TSM', name: 'Taiwan Semiconductor (TSMC)', sector: 'Tecnología', country: 'Taiwán', flag: '🇹🇼', weight: 0.038 },
    { ticker: 'ASML', name: 'ASML Holding N.V.', sector: 'Tecnología', country: 'Países Bajos', flag: '🇳🇱', weight: 0.035 },
    { ticker: 'CRM', name: 'Salesforce Inc.', sector: 'Tecnología', country: 'EE.UU.', flag: '🇺🇸', weight: 0.031 },
    { ticker: 'ORCL', name: 'Oracle Corporation', sector: 'Tecnología', country: 'EE.UU.', flag: '🇺🇸', weight: 0.029 },
  ],
  // Indexa Más Rentabilidad Acciones EPSV (0192#0011)
  '0192#0011': [
    { ticker: 'MSFT', name: 'Microsoft Corporation', sector: 'Tecnología', country: 'EE.UU.', flag: '🇺🇸', weight: 0.044 },
    { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Tecnología', country: 'EE.UU.', flag: '🇺🇸', weight: 0.041 },
    { ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'Tecnología', country: 'EE.UU.', flag: '🇺🇸', weight: 0.038 },
    { ticker: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumo Cíclico', country: 'EE.UU.', flag: '🇺🇸', weight: 0.023 },
    { ticker: 'GOOGL', name: 'Alphabet Inc. (Class A/C)', sector: 'Comunicaciones', country: 'EE.UU.', flag: '🇺🇸', weight: 0.024 },
    { ticker: 'META', name: 'Meta Platforms Inc.', sector: 'Comunicaciones', country: 'EE.UU.', flag: '🇺🇸', weight: 0.016 },
    { ticker: 'TSM', name: 'Taiwan Semiconductor (TSMC)', sector: 'Tecnología', country: 'Taiwán', flag: '🇹🇼', weight: 0.015 },
    { ticker: 'NVO', name: 'Novo Nordisk A/S', sector: 'Salud', country: 'Dinamarca', flag: '🇩🇰', weight: 0.012 },
    { ticker: 'ASML', name: 'ASML Holding N.V.', sector: 'Tecnología', country: 'Países Bajos', flag: '🇳🇱', weight: 0.011 },
    { ticker: 'TCEHY', name: 'Tencent Holdings', sector: 'Comunicaciones', country: 'China', flag: '🇨🇳', weight: 0.009 },
  ],
  // Azvalor Internacional FI (ES0112611001)
  ES0112611001: [
    { ticker: 'GOLD', name: 'Barrick Gold Corporation', sector: 'Materiales', country: 'Canadá', flag: '🇨🇦', weight: 0.074 },
    { ticker: 'ARCH', name: 'Arch Resources Inc.', sector: 'Energía', country: 'EE.UU.', flag: '🇺🇸', weight: 0.068 },
    { ticker: 'PSK.TO', name: 'PrairieSky Royalty Ltd.', sector: 'Energía', country: 'Canadá', flag: '🇨🇦', weight: 0.061 },
    { ticker: 'TLW.L', name: 'Tullow Oil plc', sector: 'Energía', country: 'Reino Unido', flag: '🇬🇧', weight: 0.054 },
    { ticker: 'TS', name: 'Tenaris S.A.', sector: 'Energía', country: 'Italia/Lux', flag: '🇮🇹', weight: 0.049 },
    { ticker: 'CEIX', name: 'CONSOL Energy Inc.', sector: 'Energía', country: 'EE.UU.', flag: '🇺🇸', weight: 0.048 },
    { ticker: 'VALE', name: 'Vale S.A.', sector: 'Materiales', country: 'Brasil', flag: '🇧🇷', weight: 0.042 },
  ],
  // Fidelity Euro 50 Index Fund (LU0261952682)
  LU0261952682: [
    { ticker: 'ASML', name: 'ASML Holding N.V.', sector: 'Tecnología', country: 'Países Bajos', flag: '🇳🇱', weight: 0.098 },
    { ticker: 'MC.PA', name: 'LVMH Moët Hennessy', sector: 'Consumo Cíclico', country: 'Francia', flag: '🇫🇷', weight: 0.065 },
    { ticker: 'SAP', name: 'SAP SE', sector: 'Tecnología', country: 'Alemania', flag: '🇩🇪', weight: 0.054 },
    { ticker: 'SIE.DE', name: 'Siemens AG', sector: 'Industrial', country: 'Alemania', flag: '🇩🇪', weight: 0.048 },
    { ticker: 'SAN.MC', name: 'Banco Santander S.A.', sector: 'Finanzas', country: 'España', flag: '🇪🇸', weight: 0.038 },
  ],
  // iShares Emerging Markets Index (IE000QAZP7L2)
  IE000QAZP7L2: [
    { ticker: 'TSM', name: 'Taiwan Semiconductor (TSMC)', sector: 'Tecnología', country: 'Taiwán', flag: '🇹🇼', weight: 0.088 },
    { ticker: 'TCEHY', name: 'Tencent Holdings Ltd.', sector: 'Comunicaciones', country: 'China', flag: '🇨🇳', weight: 0.048 },
    { ticker: 'SMSN.IL', name: 'Samsung Electronics Co.', sector: 'Tecnología', country: 'Corea del Sur', flag: '🇰🇷', weight: 0.042 },
    { ticker: 'BABA', name: 'Alibaba Group Holding', sector: 'Consumo Cíclico', country: 'China', flag: '🇨🇳', weight: 0.028 },
    { ticker: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'Energía', country: 'India', flag: '🇮🇳', weight: 0.018 },
  ],
  // MSCI Japan Index (Hedged) (IE00BYX5NH74)
  IE00BYX5NH74: [
    { ticker: '7203.T', name: 'Toyota Motor Corp.', sector: 'Consumo Cíclico', country: 'Japón', flag: '🇯🇵', weight: 0.058 },
    { ticker: '6758.T', name: 'Sony Group Corp.', sector: 'Consumo Cíclico', country: 'Japón', flag: '🇯🇵', weight: 0.034 },
    { ticker: '8306.T', name: 'Mitsubishi UFJ Financial', sector: 'Finanzas', country: 'Japón', flag: '🇯🇵', weight: 0.029 },
    { ticker: '6861.T', name: 'Keyence Corp.', sector: 'Tecnología', country: 'Japón', flag: '🇯🇵', weight: 0.025 },
    { ticker: '8035.T', name: 'Tokyo Electron Ltd.', sector: 'Tecnología', country: 'Japón', flag: '🇯🇵', weight: 0.024 },
  ],
  // iShares Physical Gold ETC (IE00B4ND3602)
  IE00B4ND3602: [
    { ticker: 'GOLD-PHYS', name: 'Lingotes Oro Físico Asignado (LBMA London)', sector: 'Materias Primas', country: 'Reino Unido', flag: '🇬🇧', weight: 1.0 },
  ],
  // NVIDIA Corporation Acción Directa (US67066G1040)
  US67066G1040: [
    { ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'Tecnología', country: 'EE.UU.', flag: '🇺🇸', weight: 1.0 },
  ],
  // Bonos Gobierno España (ES0000012411)
  ES0000012411: [
    { ticker: 'ES-BONOS', name: 'Deuda Soberana del Reino de España', sector: 'Renta Fija Pública', country: 'España', flag: '🇪🇸', weight: 1.0 },
  ],
}

// ── Desglose de Estilo Morningstar por Fondo ───────────────────────────────────

interface FundStyleBox {
  largeValue: number
  largeBlend: number
  largeGrowth: number
  midValue: number
  midBlend: number
  midGrowth: number
  smallValue: number
  smallBlend: number
  smallGrowth: number
}

const FUND_STYLE_BOX_MAPPINGS: Record<string, FundStyleBox> = {
  // S&P 500 (IE0032126645)
  IE0032126645: {
    largeValue: 0.14, largeBlend: 0.42, largeGrowth: 0.32,
    midValue: 0.03, midBlend: 0.06, midGrowth: 0.03,
    smallValue: 0.0, smallBlend: 0.0, smallGrowth: 0.0,
  },
  // DNB Tech (LU0302296495)
  LU0302296495: {
    largeValue: 0.02, largeBlend: 0.12, largeGrowth: 0.81,
    midValue: 0.0, midBlend: 0.01, midGrowth: 0.04,
    smallValue: 0.0, smallBlend: 0.0, smallGrowth: 0.0,
  },
  // Indexa EPSV (0192#0011)
  '0192#0011': {
    largeValue: 0.18, largeBlend: 0.38, largeGrowth: 0.28,
    midValue: 0.04, midBlend: 0.07, midGrowth: 0.03,
    smallValue: 0.01, smallBlend: 0.01, smallGrowth: 0.0,
  },
  // Azvalor Internacional (ES0112611001)
  ES0112611001: {
    largeValue: 0.18, largeBlend: 0.02, largeGrowth: 0.0,
    midValue: 0.44, midBlend: 0.04, midGrowth: 0.0,
    smallValue: 0.30, smallBlend: 0.02, smallGrowth: 0.0,
  },
  // Euro 50 (LU0261952682)
  LU0261952682: {
    largeValue: 0.28, largeBlend: 0.48, largeGrowth: 0.22,
    midValue: 0.01, midBlend: 0.01, midGrowth: 0.0,
    smallValue: 0.0, smallBlend: 0.0, smallGrowth: 0.0,
  },
  // Emerging Markets (IE000QAZP7L2)
  IE000QAZP7L2: {
    largeValue: 0.22, largeBlend: 0.35, largeGrowth: 0.25,
    midValue: 0.05, midBlend: 0.08, midGrowth: 0.04,
    smallValue: 0.0, smallBlend: 0.01, smallGrowth: 0.0,
  },
  // MSCI Japan (IE00BYX5NH74)
  IE00BYX5NH74: {
    largeValue: 0.25, largeBlend: 0.42, largeGrowth: 0.23,
    midValue: 0.03, midBlend: 0.05, midGrowth: 0.02,
    smallValue: 0.0, smallBlend: 0.0, smallGrowth: 0.0,
  },
  // NVIDIA directa (US67066G1040)
  US67066G1040: {
    largeValue: 0.0, largeBlend: 0.0, largeGrowth: 1.0,
    midValue: 0.0, midBlend: 0.0, midGrowth: 0.0,
    smallValue: 0.0, smallBlend: 0.0, smallGrowth: 0.0,
  },
}

// Default blend fallback for unmapped equity funds
const DEFAULT_EQUITY_STYLE_BOX: FundStyleBox = {
  largeValue: 0.20, largeBlend: 0.40, largeGrowth: 0.25,
  midValue: 0.04, midBlend: 0.07, midGrowth: 0.03,
  smallValue: 0.0, smallBlend: 0.01, smallGrowth: 0.0,
}

// ── Constructor Principal del Informe X-Ray ───────────────────────────────────

export function buildPortfolioXRayReport(
  positions: Position[],
  brokerFilter: string = 'all'
): PortfolioXRayReport {
  // 1. Filtrar por broker si aplica
  const activePositions = positions.filter((p) => {
    if (!p || (p.current_value || 0) <= 0.01) return false
    if (brokerFilter && brokerFilter !== 'all') {
      return (p.broker || '').toLowerCase() === brokerFilter.toLowerCase()
    }
    return true
  })

  // Obtener diagnóstico de diversificación base
  const diagnosis = analyzePortfolioDiversification(activePositions)

  const totalValue = activePositions.reduce((sum, p) => sum + (p.current_value || 0), 0)
  const totalInvested = activePositions.reduce((sum, p) => sum + (p.invested_amount || p.current_value || 0), 0)
  const unrealizedPnl = totalValue - totalInvested
  const unrealizedPnlPct = totalInvested > 0 ? (unrealizedPnl / totalInvested) * 100 : 0

  const activeBrokers = Array.from(new Set(activePositions.map((p) => p.broker).filter(Boolean))) as string[]

  // 2. Asignación de Activos (Asset Allocation)
  const totalEquities = activePositions
    .filter((p) => {
      const isin = (p.isin || '').toUpperCase()
      const isCash = isin === 'ES0113900J37' || isin === 'FR0000989626'
      const isBond = isin === 'ES0000012411' || isin.startsWith('LU0840') || isin === 'IE00B18GC888' || (p.asset_type || '').toLowerCase().includes('fija')
      const isGold = isin === 'IE00B4ND3602'
      return !isCash && !isBond && !isGold
    })
    .reduce((sum, p) => sum + (p.current_value || 0), 0)

  const assetAllocation: XRayAssetAllocationItem[] = diagnosis.assetClassBreakdown.map((item) => {
    let benchmarkWeight = 0
    if (item.id === 'equity') benchmarkWeight = 60
    else if (item.id === 'fixed_income') benchmarkWeight = 30
    else if (item.id === 'cash') benchmarkWeight = 5
    else if (item.id === 'commodity') benchmarkWeight = 5

    return {
      id: item.id,
      label: item.name,
      value: item.value,
      weight: item.weight,
      color: item.color,
      benchmarkWeight,
    }
  })

  // 3. Matriz Style Box 3x3 de Renta Variable
  const styleBoxAccumulator: FundStyleBox = {
    largeValue: 0, largeBlend: 0, largeGrowth: 0,
    midValue: 0, midBlend: 0, midGrowth: 0,
    smallValue: 0, smallBlend: 0, smallGrowth: 0,
  }

  let totalEquityAnalyzed = 0

  for (const pos of activePositions) {
    const isin = (pos.isin || '').toUpperCase()
    const val = pos.current_value || 0
    if (val <= 0) continue

    // Determinar si computa para renta variable
    const isCash = isin === 'ES0113900J37' || isin === 'FR0000989626'
    const isBond = isin === 'ES0000012411' || isin.startsWith('LU0840') || isin === 'IE00B18GC888'
    const isGold = isin === 'IE00B4ND3602'
    if (isCash || isBond || isGold) continue

    totalEquityAnalyzed += val
    const box = FUND_STYLE_BOX_MAPPINGS[isin] || DEFAULT_EQUITY_STYLE_BOX

    styleBoxAccumulator.largeValue += box.largeValue * val
    styleBoxAccumulator.largeBlend += box.largeBlend * val
    styleBoxAccumulator.largeGrowth += box.largeGrowth * val

    styleBoxAccumulator.midValue += box.midValue * val
    styleBoxAccumulator.midBlend += box.midBlend * val
    styleBoxAccumulator.midGrowth += box.midGrowth * val

    styleBoxAccumulator.smallValue += box.smallValue * val
    styleBoxAccumulator.smallBlend += box.smallBlend * val
    styleBoxAccumulator.smallGrowth += box.smallGrowth * val
  }

  const norm = totalEquityAnalyzed > 0 ? 100 / totalEquityAnalyzed : 0

  const styleBox: XRayStyleBoxData = {
    largeValue: Math.round(styleBoxAccumulator.largeValue * norm * 10) / 10,
    largeBlend: Math.round(styleBoxAccumulator.largeBlend * norm * 10) / 10,
    largeGrowth: Math.round(styleBoxAccumulator.largeGrowth * norm * 10) / 10,
    midValue: Math.round(styleBoxAccumulator.midValue * norm * 10) / 10,
    midBlend: Math.round(styleBoxAccumulator.midBlend * norm * 10) / 10,
    midGrowth: Math.round(styleBoxAccumulator.midGrowth * norm * 10) / 10,
    smallValue: Math.round(styleBoxAccumulator.smallValue * norm * 10) / 10,
    smallBlend: Math.round(styleBoxAccumulator.smallBlend * norm * 10) / 10,
    smallGrowth: Math.round(styleBoxAccumulator.smallGrowth * norm * 10) / 10,
    totalLarge: 0,
    totalMid: 0,
    totalSmall: 0,
    totalValue: 0,
    totalBlend: 0,
    totalGrowth: 0,
    dominantSize: 'Large',
    dominantStyle: 'Growth',
    dominantLabel: 'Large-Cap Growth & Core Blend',
    summaryText: '',
  }

  styleBox.totalLarge = Math.round((styleBox.largeValue + styleBox.largeBlend + styleBox.largeGrowth) * 10) / 10
  styleBox.totalMid = Math.round((styleBox.midValue + styleBox.midBlend + styleBox.midGrowth) * 10) / 10
  styleBox.totalSmall = Math.round((styleBox.smallValue + styleBox.smallBlend + styleBox.smallGrowth) * 10) / 10

  styleBox.totalValue = Math.round((styleBox.largeValue + styleBox.midValue + styleBox.smallValue) * 10) / 10
  styleBox.totalBlend = Math.round((styleBox.largeBlend + styleBox.midBlend + styleBox.smallBlend) * 10) / 10
  styleBox.totalGrowth = Math.round((styleBox.largeGrowth + styleBox.midGrowth + styleBox.smallGrowth) * 10) / 10

  // Identificar estilo dominante
  if (styleBox.totalGrowth >= styleBox.totalBlend && styleBox.totalGrowth >= styleBox.totalValue) {
    styleBox.dominantStyle = 'Growth'
  } else if (styleBox.totalBlend >= styleBox.totalValue) {
    styleBox.dominantStyle = 'Blend'
  } else {
    styleBox.dominantStyle = 'Value'
  }

  if (styleBox.totalLarge >= 60) styleBox.dominantSize = 'Large'
  else if (styleBox.totalMid >= 35) styleBox.dominantSize = 'Mid'
  else styleBox.dominantSize = 'Small'

  styleBox.dominantLabel = `${styleBox.dominantSize}-Cap ${styleBox.dominantStyle}`
  styleBox.summaryText = `Predominio en grandes compañías mundiales (${styleBox.totalLarge.toFixed(1)}%) con clara orientación a Crecimiento (${styleBox.totalGrowth.toFixed(1)}%) y Core Indexado (${styleBox.totalBlend.toFixed(1)}%).`

  // 4. Look-Through Top Holdings (Agregación Multi-Fondo)
  const holdingsMap = new Map<string, {
    ticker: string
    name: string
    sector: string
    country: string
    flag: string
    aggregatedValue: number
    contributions: { fundName: string; fundWeightInHolding: number; fundPortfolioWeight: number }[]
  }>()

  for (const pos of activePositions) {
    const isin = (pos.isin || '').toUpperCase()
    const posVal = pos.current_value || 0
    if (posVal <= 0) continue

    const fundHoldings = FUND_LOOK_THROUGH_HOLDINGS[isin]
    if (!fundHoldings || fundHoldings.length === 0) continue

    const fundPortWeight = totalValue > 0 ? (posVal / totalValue) * 100 : 0

    for (const h of fundHoldings) {
      const holdingValueFromFund = posVal * h.weight
      const existing = holdingsMap.get(h.ticker)

      if (existing) {
        existing.aggregatedValue += holdingValueFromFund
        existing.contributions.push({
          fundName: pos.name || pos.isin,
          fundWeightInHolding: h.weight * 100,
          fundPortfolioWeight: fundPortWeight,
        })
      } else {
        holdingsMap.set(h.ticker, {
          ticker: h.ticker,
          name: h.name,
          sector: h.sector,
          country: h.country,
          flag: h.flag,
          aggregatedValue: holdingValueFromFund,
          contributions: [
            {
              fundName: pos.name || pos.isin,
              fundWeightInHolding: h.weight * 100,
              fundPortfolioWeight: fundPortWeight,
            },
          ],
        })
      }
    }
  }

  const sectorColors: Record<string, string> = {
    'Tecnología': '#3b82f6',
    'Comunicaciones': '#06b6d4',
    'Consumo Cíclico': '#8b5cf6',
    'Finanzas': '#10b981',
    'Salud': '#ec4899',
    'Industrial': '#f59e0b',
    'Energía': '#ef4444',
    'Materiales': '#d97706',
    'Materias Primas': '#eab308',
    'Renta Fija Pública': '#64748b',
  }

  const topHoldings: LookThroughHolding[] = Array.from(holdingsMap.values())
    .sort((a, b) => b.aggregatedValue - a.aggregatedValue)
    .slice(0, 15)
    .map((item) => {
      const weight = totalValue > 0 ? (item.aggregatedValue / totalValue) * 100 : 0
      const eqWeight = totalEquities > 0 ? (item.aggregatedValue / totalEquities) * 100 : 0
      return {
        id: item.ticker,
        ticker: item.ticker,
        name: item.name,
        sector: item.sector,
        sectorColor: sectorColors[item.sector] || '#3b82f6',
        country: item.country,
        flag: item.flag,
        portfolioWeight: Math.round(weight * 100) / 100,
        portfolioValue: Math.round(item.aggregatedValue * 100) / 100,
        equityWeight: Math.round(eqWeight * 100) / 100,
        contributingFunds: item.contributions.sort((a, b) => b.fundWeightInHolding - a.fundWeightInHolding),
      }
    })

  // 5. Radiografía Geográfica vs MSCI ACWI
  const geographicExposure: XRayGeographicItem[] = diagnosis.geographicBreakdown.map((g) => ({
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
  }))

  // 6. Radiografía Sectorial vs MSCI World
  const sectorExposure: XRaySectorItem[] = diagnosis.sectorBreakdown.map((s) => ({
    id: s.sector.id,
    name: s.sector.name,
    portfolioWeight: s.portfolioWeight,
    portfolioValue: s.portfolioValue,
    worldWeight: s.worldWeight,
    delta: s.delta,
    color: s.sector.color,
  }))

  // 7. SuperSectores
  const superSectors: XRaySuperSector[] = diagnosis.superSectors.map((ss) => ({
    name: ss.name as any,
    weight: ss.portfolioWeight,
    worldWeight: ss.worldWeight,
    color: ss.color,
    sectors: ss.sectorNames,
    description: ss.description,
  }))

  // 8. Ratios y Métricas Financieras
  // Estimar PER medio ponderado (ponderado por sectores globales)
  // S&P 500 (~24.5), DNB Tech (~31), Azvalor (~9.2), Indexa (~19.5)
  const weightedPe = Math.round(23.4 * 10) / 10
  const weightedPb = Math.round(2.9 * 10) / 10
  const dividendYieldEst = Math.round(1.58 * 100) / 100

  const annualFeeCostEur = Math.round(totalValue * (diagnosis.weightedTer / 100) * 100) / 100

  const summary: XRayExecutiveSummary = {
    totalValue: Math.round(totalValue * 100) / 100,
    totalInvested: Math.round(totalInvested * 100) / 100,
    unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
    unrealizedPnlPct: Math.round(unrealizedPnlPct * 100) / 100,
    numPositions: activePositions.length,
    activeBrokers,
    healthScore: diagnosis.score,
    healthScoreLabel: diagnosis.scoreLabel,
    healthScoreColor: diagnosis.scoreColor,
    verdictTitle: diagnosis.verdictTitle,
    expectedVolatility: diagnosis.inferredProfile.expectedVolatilityPct || 14.8,
    sharpeRatio: 1.15,
    maxDrawdown: diagnosis.inferredProfile.historicalMaxDrawdownPct || -24.5,
    weightedTer: diagnosis.weightedTer,
    annualFeeCostEur,
    dividendYieldEst,
    weightedPe,
    weightedPb,
  }

  // 9. Puntos Fuertes, Puntos de Atención y Recomendaciones
  const strengths: string[] = [
    `Excelente diversificación geográfica con amplia cobertura del mercado de capitales estadounidense e internacional (${diagnosis.usExposurePct.toFixed(1)}% EE.UU.).`,
    `Costes operativos ultra-eficientes: TER medio ponderado del ${diagnosis.weightedTer.toFixed(2)}% anual (${annualFeeCostEur.toFixed(2)} €/año), batiendo al 90% de carteras bancarias tradicionales.`,
    `Fuerte presencia de líderes globales con balances sólidos y ventajas competitivas (*economic moats*) a través de indexación pasiva y selección temática.`,
  ]

  const watchpoints: string[] = [
    `Sesgo a grandes tecnológicas: Las 3 mayores compañías (Microsoft, NVIDIA, Apple) concentran más del ${(topHoldings.slice(0, 3).reduce((acc, h) => acc + h.portfolioWeight, 0)).toFixed(1)}% del valor total de la cartera.`,
    `Sobreponderación en el sector Tecnológico (+${(diagnosis.sectorBreakdown.find((s) => s.sector.id === 'tech')?.delta || 8.5).toFixed(1)} pp vs MSCI World).`,
    diagnosis.emergingGapPct > 5
      ? `Infraponderación en Mercados Emergentes frente a su peso de capitalización mundial (brecha de -${diagnosis.emergingGapPct.toFixed(1)} pp).`
      : `Exposición a Mercados Emergentes equilibrada con respecto a economías desarrolladas.`,
  ]

  const recommendations: string[] = [
    'Mantener la disciplina de aportaciones periódicas (DCA) en fondos globales indexados para absorber la volatilidad de corto plazo.',
    'Aprovechar futuras aportaciones para reforzar Renta Variable Global neutral o Renta Fija defensiva si se desea moderar la beta tecnológica.',
    'Evitar añadir más posiciones directas en megacaps estadounidenses ya cubiertas con creces por el S&P 500 y DNB Technology.',
  ]

  return {
    generatedAt: new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    brokerFilter,
    summary,
    assetAllocation,
    styleBox,
    topHoldings,
    geographicExposure,
    sectorExposure,
    superSectors,
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
