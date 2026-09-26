export interface Position {
  isin: string
  name: string
  ticker?: string | null
  domain?: string | null
  category?: string | null
  ter?: number | null
  geo?: string | null
  asset_type: 'fund' | 'etf' | 'stock' | 'bond' | 'crypto' | string
  currency: string
  shares: number
  avg_cost: number
  current_price: number | null
  current_value: number
  invested_amount: number
  unrealized_pnl: number
  unrealized_pnl_pct: number
  weight: number
  last_updated?: string | null
}

export interface PortfolioSummary {
  total_value: number
  total_invested: number
  total_pnl: number
  total_pnl_pct: number
  num_positions: number
  last_updated: string
}

export interface Analytics {
  twr: number
  cagr: number
  volatility: number
  max_drawdown: number
  sharpe_ratio: number
  return_ytd: number
  return_1m: number
  return_3m: number
  return_6m: number
}

export interface Transaction {
  id: number | string
  isin: string
  name?: string
  type: 'buy' | 'sell' | 'dividend' | 'transfer'
  shares: number
  price: number
  amount: number
  fees?: number
  date: string
  broker: string
  notes?: string | null
}

export interface PricePoint {
  date: string
  value: number
  price?: number
}

export const MOCK_SUMMARY: PortfolioSummary = {
  total_value: 128450.80,
  total_invested: 104200.00,
  total_pnl: 24250.80,
  total_pnl_pct: 23.27,
  num_positions: 8,
  last_updated: new Date().toISOString(),
}

export const MOCK_POSITIONS: Position[] = [
  {
    isin: 'IE00B03HD191',
    name: 'Vanguard Global Stock Index Fund EUR Acc',
    ticker: 'VGSEI',
    domain: 'vanguard.com',
    category: 'Renta Variable Global Large-Cap Blend',
    ter: 0.18,
    geo: 'Global',
    asset_type: 'fund',
    currency: 'EUR',
    shares: 845.321,
    avg_cost: 41.20,
    current_price: 52.84,
    current_value: 44666.76,
    invested_amount: 34827.23,
    unrealized_pnl: 9839.53,
    unrealized_pnl_pct: 28.25,
    weight: 34.77,
    last_updated: '2026-09-24T18:30:00Z',
  },
  {
    isin: 'IE00BYX5NX33',
    name: 'Fidelity MSCI World Index Fund EUR P Acc',
    ticker: 'FIDWLD',
    domain: 'fidelity.es',
    category: 'Renta Variable Global Large-Cap Blend',
    ter: 0.12,
    geo: 'Global',
    asset_type: 'fund',
    currency: 'EUR',
    shares: 1520.450,
    avg_cost: 16.85,
    current_price: 21.42,
    current_value: 32568.04,
    invested_amount: 25619.58,
    unrealized_pnl: 6948.46,
    unrealized_pnl_pct: 27.12,
    weight: 25.35,
    last_updated: '2026-09-24T18:30:00Z',
  },
  {
    isin: 'IE00B4L5Y983',
    name: 'iShares Core MSCI World UCITS ETF (Acc)',
    ticker: 'IWDA.AS',
    domain: 'ishares.com',
    category: 'Renta Variable Global Large-Cap',
    ter: 0.20,
    geo: 'Global',
    asset_type: 'etf',
    currency: 'EUR',
    shares: 195.0,
    avg_cost: 76.50,
    current_price: 98.40,
    current_value: 19188.00,
    invested_amount: 14917.50,
    unrealized_pnl: 4270.50,
    unrealized_pnl_pct: 28.63,
    weight: 14.94,
    last_updated: '2026-09-25T15:30:00Z',
  },
  {
    isin: 'IE0031786696',
    name: 'Vanguard Emerging Markets Stock Index EUR',
    ticker: 'VEMS',
    domain: 'vanguard.com',
    category: 'Renta Variable Mercados Emergentes',
    ter: 0.23,
    geo: 'Emergentes',
    asset_type: 'fund',
    currency: 'EUR',
    shares: 410.120,
    avg_cost: 24.10,
    current_price: 27.85,
    current_value: 11421.84,
    invested_amount: 9883.89,
    unrealized_pnl: 1537.95,
    unrealized_pnl_pct: 15.56,
    weight: 8.89,
    last_updated: '2026-09-24T18:30:00Z',
  },
  {
    isin: 'US0378331005',
    name: 'Apple Inc.',
    ticker: 'AAPL',
    domain: 'apple.com',
    category: 'Tecnología / Consumo',
    ter: 0.0,
    geo: 'Estados Unidos',
    asset_type: 'stock',
    currency: 'USD',
    shares: 35.0,
    avg_cost: 168.20,
    current_price: 228.50,
    current_value: 7997.50,
    invested_amount: 5887.00,
    unrealized_pnl: 2110.50,
    unrealized_pnl_pct: 35.85,
    weight: 6.23,
    last_updated: '2026-09-25T16:00:00Z',
  },
  {
    isin: 'US5949181045',
    name: 'Microsoft Corporation',
    ticker: 'MSFT',
    domain: 'microsoft.com',
    category: 'Tecnología / Software Cloud',
    ter: 0.0,
    geo: 'Estados Unidos',
    asset_type: 'stock',
    currency: 'USD',
    shares: 15.0,
    avg_cost: 340.00,
    current_price: 432.10,
    current_value: 6481.50,
    invested_amount: 5100.00,
    unrealized_pnl: 1381.50,
    unrealized_pnl_pct: 27.09,
    weight: 5.05,
    last_updated: '2026-09-25T16:00:00Z',
  },
  {
    isin: 'US67066G1040',
    name: 'NVIDIA Corporation',
    ticker: 'NVDA',
    domain: 'nvidia.com',
    category: 'Semiconductores / IA',
    ter: 0.0,
    geo: 'Estados Unidos',
    asset_type: 'stock',
    currency: 'USD',
    shares: 30.0,
    avg_cost: 78.50,
    current_price: 122.40,
    current_value: 3672.00,
    invested_amount: 2355.00,
    unrealized_pnl: 1317.00,
    unrealized_pnl_pct: 55.92,
    weight: 2.86,
    last_updated: '2026-09-25T16:00:00Z',
  },
  {
    isin: 'ES0113900J37',
    name: 'Cuenta Liquidez Remunerada',
    ticker: 'CASH',
    domain: 'myinvestor.es',
    category: 'Monetario / Liquidez EUR',
    ter: 0.0,
    geo: 'Zona Euro',
    asset_type: 'fund',
    currency: 'EUR',
    shares: 2455.16,
    avg_cost: 1.0,
    current_price: 1.0,
    current_value: 2455.16,
    invested_amount: 2455.16,
    unrealized_pnl: 0.0,
    unrealized_pnl_pct: 0.0,
    weight: 1.91,
    last_updated: '2026-09-25T12:00:00Z',
  },
]

export const MOCK_ANALYTICS: Analytics = {
  twr: 21.45,
  cagr: 14.82,
  volatility: 11.60,
  max_drawdown: -8.74,
  sharpe_ratio: 1.42,
  return_ytd: 16.80,
  return_1m: 2.15,
  return_3m: 5.40,
  return_6m: 9.75,
}

// ─────────────────────────────────────────────────────────────────────────────
// Real-world Stochastic Financial Series Generator (Geometric Brownian Motion)
// ─────────────────────────────────────────────────────────────────────────────

function createPRNG(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/**
 * Generates an authentic financial portfolio valuation timeline.
 * Replaces synthetic sine waves with realistic multi-day momentum, macro volatility,
 * weekend trading plateaus, and periodic DCA injections.
 */
export function generateRealisticPerformanceSeries(
  days: number,
  startVal: number,
  endVal: number,
  seed = 101,
  monthlyDca = 1200
): PricePoint[] {
  const prng = createPRNG(seed + days * 7)
  const points: PricePoint[] = []
  const now = new Date()

  // Generate calendar dates up to today
  const dates: string[] = []
  for (let i = days; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 3600 * 1000)
    dates.push(d.toISOString().split('T')[0])
  }

  // Calculate parameters for geometric brownian motion
  const totalReturn = Math.log(endVal / startVal)
  const drift = totalReturn / days
  const dailyVol = 0.0072 // 0.72% daily volatility typical of diversified portfolios

  const rawValues: number[] = [startVal]
  let momentum = 0.0

  for (let t = 1; t <= days; t++) {
    const dateObj = new Date(dates[t])
    const dayOfWeek = dateObj.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    if (isWeekend) {
      // Weekend: portfolio retains Friday NAV price
      rawValues.push(rawValues[t - 1])
      continue
    }

    // Normal shock via Box-Muller transform
    const u1 = Math.max(1e-7, prng())
    const u2 = Math.max(1e-7, prng())
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)

    // Momentum autoregressive factor creates realistic multi-day runs & pullbacks
    momentum = 0.65 * momentum + 0.35 * z
    const shock = drift + momentum * dailyVol * 0.45 + z * dailyVol * 0.55

    // Periodic monthly DCA deposit (around the 5th of each month)
    const isDcaDay = dateObj.getDate() === 5
    const dcaBonus = isDcaDay ? monthlyDca : 0

    const prev = rawValues[t - 1]
    const nextVal = (prev + dcaBonus) * Math.exp(shock)
    rawValues.push(nextVal)
  }

  // Anchor curve precisely to endVal at t = days
  const rawEnd = rawValues[days]
  const finalValues: number[] = []

  for (let t = 0; t <= days; t++) {
    const progress = t / days
    // Smooth non-linear bridge so early values stay close to historical start
    const bridgeFactor = Math.pow(progress, 1.35)
    const val = rawValues[t] + (endVal - rawEnd) * bridgeFactor
    finalValues.push(Math.round(val * 100) / 100)
  }

  // Ensure exact finish at current portfolio value
  finalValues[days] = endVal

  for (let t = 0; t <= days; t++) {
    points.push({
      date: dates[t],
      value: finalValues[t],
      price: finalValues[t],
    })
  }

  return points
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo User Performance Sets
// ─────────────────────────────────────────────────────────────────────────────

const demo1m = generateRealisticPerformanceSeries(30, 125200, 128450.80, 42, 800)
const demo3m = generateRealisticPerformanceSeries(90, 121500, 128450.80, 84, 1000)
const demo6m = generateRealisticPerformanceSeries(180, 116400, 128450.80, 126, 1100)
const demo1y = generateRealisticPerformanceSeries(365, 108900, 128450.80, 168, 1200)
const demo2y = generateRealisticPerformanceSeries(730, 94200, 128450.80, 210, 1250)
const demo5y = generateRealisticPerformanceSeries(1825, 68000, 128450.80, 252, 1300)

export const MOCK_PERFORMANCE: Record<string, PricePoint[]> = {
  '1m': demo1m,
  '1mo': demo1m,
  '3m': demo3m,
  '3mo': demo3m,
  '6m': demo6m,
  '6mo': demo6m,
  '1y': demo1y,
  '2y': demo2y,
  '5y': demo5y,
  'ytd': demo1y,
  'max': demo5y,
}

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 1,
    isin: 'IE00B03HD191',
    name: 'Vanguard Global Stock Index Fund EUR Acc',
    type: 'buy',
    shares: 20.5,
    price: 52.84,
    amount: 1083.22,
    fees: 0,
    date: '2026-09-05',
    broker: 'MyInvestor',
    notes: 'Aportación periódica mensual DCA',
  },
  {
    id: 2,
    isin: 'IE00BYX5NX33',
    name: 'Fidelity MSCI World Index Fund EUR P Acc',
    type: 'buy',
    shares: 42.0,
    price: 21.42,
    amount: 899.64,
    fees: 0,
    date: '2026-09-05',
    broker: 'MyInvestor',
    notes: 'Aportación periódica mensual DCA',
  },
  {
    id: 3,
    isin: 'US67066G1040',
    name: 'NVIDIA Corporation',
    type: 'buy',
    shares: 10.0,
    price: 118.50,
    amount: 1185.00,
    fees: 2.5,
    date: '2026-08-20',
    broker: 'Trade Republic',
    notes: 'Compra táctica',
  },
  {
    id: 4,
    isin: 'US0378331005',
    name: 'Apple Inc.',
    type: 'dividend',
    shares: 35.0,
    price: 0.25,
    amount: 8.75,
    fees: 0,
    date: '2026-08-15',
    broker: 'Trade Republic',
    notes: 'Cobro dividendo trimestral',
  },
  {
    id: 5,
    isin: 'IE00B4L5Y983',
    name: 'iShares Core MSCI World UCITS ETF (Acc)',
    type: 'buy',
    shares: 15.0,
    price: 95.20,
    amount: 1428.00,
    fees: 1.0,
    date: '2026-08-01',
    broker: 'Scalable Capital',
    notes: 'Ahorro programado ETF',
  },
  {
    id: 6,
    isin: 'IE0031786696',
    name: 'Vanguard Emerging Markets Stock Index EUR',
    type: 'buy',
    shares: 18.2,
    price: 26.50,
    amount: 482.30,
    fees: 0,
    date: '2026-07-05',
    broker: 'MyInvestor',
    notes: 'Rebalanceo cartera indexada',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Multi-User Profile Definitions & Dedicated Portfolios
// ─────────────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  name: string
  email: string
  avatar: string
  role: string
  strategy: string
  badge: string
  broker: string
  isDemo: boolean
  color: string
  bgGradient?: string
  passwordHash?: string
  passwordSalt?: string
  summary: PortfolioSummary
  positions: Position[]
  analytics: Analytics
  performance: Record<string, PricePoint[]>
  transactions: Transaction[]
}

// ── Profile 1: Usuario Demo ──────────────────────────────────────────────────
const DEMO_USER: UserProfile = {
  id: 'demo',
  name: 'Usuario Demo',
  email: 'demo@portfoliopro.app',
  avatar: 'UD',
  role: 'Inversor Boglehead Global',
  strategy: 'Boglehead Indexado + Tech Core',
  badge: 'Demo (Mock)',
  broker: 'MyInvestor / Scalable',
  isDemo: true,
  color: 'bg-blue-600 text-white',
  bgGradient: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
  summary: MOCK_SUMMARY,
  positions: MOCK_POSITIONS,
  analytics: MOCK_ANALYTICS,
  performance: MOCK_PERFORMANCE,
  transactions: MOCK_TRANSACTIONS,
}

// ── Profile 2: Asier Moreno (Growth & Tech Megacaps) ─────────────────────────
const asier1m = generateRealisticPerformanceSeries(30, 181200, 186420.00, 77, 1500)
const asier3m = generateRealisticPerformanceSeries(90, 174500, 186420.00, 154, 1500)
const asier6m = generateRealisticPerformanceSeries(180, 162000, 186420.00, 231, 1500)
const asier1y = generateRealisticPerformanceSeries(365, 142000, 186420.00, 308, 1600)
const asier2y = generateRealisticPerformanceSeries(730, 118000, 186420.00, 385, 1600)
const asier5y = generateRealisticPerformanceSeries(1825, 78000, 186420.00, 462, 1700)

const ASIER_POSITIONS: Position[] = [
  {
    isin: 'US67066G1040',
    name: 'NVIDIA Corporation',
    ticker: 'NVDA',
    domain: 'nvidia.com',
    category: 'Tecnología / Semiconductores & AI',
    ter: 0.0,
    geo: 'Estados Unidos',
    asset_type: 'stock',
    currency: 'USD',
    shares: 220.0,
    avg_cost: 65.40,
    current_price: 225.14,
    current_value: 49530.80,
    invested_amount: 14388.00,
    unrealized_pnl: 35142.80,
    unrealized_pnl_pct: 244.25,
    weight: 26.57,
    last_updated: '2026-09-25T20:00:00Z',
  },
  {
    isin: 'US5949181045',
    name: 'Microsoft Corporation',
    ticker: 'MSFT',
    domain: 'microsoft.com',
    category: 'Tecnología / Software & Cloud',
    ter: 0.0,
    geo: 'Estados Unidos',
    asset_type: 'stock',
    currency: 'USD',
    shares: 65.0,
    avg_cost: 340.20,
    current_price: 518.20,
    current_value: 33683.00,
    invested_amount: 22113.00,
    unrealized_pnl: 11570.00,
    unrealized_pnl_pct: 52.32,
    weight: 18.07,
    last_updated: '2026-09-25T20:00:00Z',
  },
  {
    isin: 'US0378331005',
    name: 'Apple Inc.',
    ticker: 'AAPL',
    domain: 'apple.com',
    category: 'Tecnología / Hardware & Servicios',
    ter: 0.0,
    geo: 'Estados Unidos',
    asset_type: 'stock',
    currency: 'USD',
    shares: 90.0,
    avg_cost: 185.00,
    current_price: 341.10,
    current_value: 30699.00,
    invested_amount: 16650.00,
    unrealized_pnl: 14049.00,
    unrealized_pnl_pct: 84.38,
    weight: 16.47,
    last_updated: '2026-09-25T20:00:00Z',
  },
  {
    isin: 'IE00B03HD191',
    name: 'Vanguard Global Stock Index Fund EUR Acc',
    ticker: 'VGSEI',
    domain: 'vanguard.com',
    category: 'Renta Variable Global Large-Cap',
    ter: 0.18,
    geo: 'Global',
    asset_type: 'fund',
    currency: 'EUR',
    shares: 620.0,
    avg_cost: 40.50,
    current_price: 52.84,
    current_value: 32760.80,
    invested_amount: 25110.00,
    unrealized_pnl: 7650.80,
    unrealized_pnl_pct: 30.47,
    weight: 17.57,
    last_updated: '2026-09-25T18:00:00Z',
  },
  {
    isin: 'US02079K3059',
    name: 'Alphabet Inc. Class A',
    ticker: 'GOOGL',
    domain: 'abc.xyz',
    category: 'Tecnología / Publicidad & Cloud',
    ter: 0.0,
    geo: 'Estados Unidos',
    asset_type: 'stock',
    currency: 'USD',
    shares: 55.0,
    avg_cost: 135.20,
    current_price: 344.20,
    current_value: 18931.00,
    invested_amount: 7436.00,
    unrealized_pnl: 11495.00,
    unrealized_pnl_pct: 154.59,
    weight: 10.15,
    last_updated: '2026-09-25T20:00:00Z',
  },
  {
    isin: 'BTC-EUR-COIN',
    name: 'Bitcoin (BTC Custodia Fría)',
    ticker: 'BTC',
    domain: 'bitcoin.org',
    category: 'Criptoactivo / Reserva Digital',
    ter: 0.0,
    geo: 'Global',
    asset_type: 'crypto',
    currency: 'EUR',
    shares: 0.20,
    avg_cost: 42000.0,
    current_price: 73700.0,
    current_value: 14740.00,
    invested_amount: 8400.00,
    unrealized_pnl: 6340.00,
    unrealized_pnl_pct: 75.48,
    weight: 7.91,
    last_updated: '2026-09-25T22:00:00Z',
  },
  {
    isin: 'ES0113900J37',
    name: 'Cuenta Remunerada 2.5% MyInvestor',
    ticker: 'CASH',
    domain: 'myinvestor.es',
    category: 'Liquidez / Fondo de Emergencia',
    ter: 0.0,
    geo: 'Zona Euro',
    asset_type: 'fund',
    currency: 'EUR',
    shares: 6075.40,
    avg_cost: 1.0,
    current_price: 1.0,
    current_value: 6075.40,
    invested_amount: 6075.40,
    unrealized_pnl: 0.0,
    unrealized_pnl_pct: 0.0,
    weight: 3.26,
    last_updated: '2026-09-25T12:00:00Z',
  },
]

const ASIER_USER: UserProfile = {
  id: 'asier',
  name: 'Asier Moreno',
  email: 'asier@portfoliopro.app',
  avatar: 'AM',
  role: 'Inversor Principal',
  strategy: 'Crecimiento Tecnológico & Megacaps USA',
  badge: 'Cartera Principal',
  broker: 'MyInvestor & Trade Republic',
  isDemo: false,
  color: 'bg-emerald-600 text-white',
  bgGradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
  summary: {
    total_value: 186420.00,
    total_invested: 100212.40,
    total_pnl: 86207.60,
    total_pnl_pct: 86.02,
    num_positions: ASIER_POSITIONS.length,
    last_updated: new Date().toISOString(),
  },
  positions: ASIER_POSITIONS,
  analytics: {
    twr: 34.20,
    cagr: 23.40,
    volatility: 16.80,
    max_drawdown: -12.40,
    sharpe_ratio: 1.85,
    return_ytd: 28.50,
    return_1m: 3.40,
    return_3m: 8.90,
    return_6m: 16.70,
  },
  performance: {
    '1m': asier1m,
    '1mo': asier1m,
    '3m': asier3m,
    '3mo': asier3m,
    '6m': asier6m,
    '6mo': asier6m,
    '1y': asier1y,
    '2y': asier2y,
    '5y': asier5y,
    'ytd': asier1y,
    'max': asier5y,
  },
  transactions: [
    {
      id: 'asier-1',
      isin: 'US67066G1040',
      name: 'NVIDIA Corporation',
      type: 'buy',
      shares: 15.0,
      price: 215.00,
      amount: 3225.00,
      fees: 1.0,
      date: '2026-09-12',
      broker: 'Trade Republic',
      notes: 'Ampliación posición AI',
    },
    {
      id: 'asier-2',
      isin: 'US5949181045',
      name: 'Microsoft Corporation',
      type: 'buy',
      shares: 10.0,
      price: 510.00,
      amount: 5100.00,
      fees: 1.0,
      date: '2026-09-02',
      broker: 'Trade Republic',
      notes: 'Aportación mensual tech',
    },
    {
      id: 'asier-3',
      isin: 'IE00B03HD191',
      name: 'Vanguard Global Stock Index Fund EUR Acc',
      type: 'buy',
      shares: 30.0,
      price: 52.50,
      amount: 1575.00,
      fees: 0,
      date: '2026-09-01',
      broker: 'MyInvestor',
      notes: 'Aportación periódica indexada',
    },
  ],
}

// ── Profile 3: Laura Gómez (Conservative Boglehead 80/20) ────────────────────
const laura1m = generateRealisticPerformanceSeries(30, 73100, 74380.50, 99, 600)
const laura3m = generateRealisticPerformanceSeries(90, 71200, 74380.50, 198, 600)
const laura6m = generateRealisticPerformanceSeries(180, 68400, 74380.50, 297, 600)
const laura1y = generateRealisticPerformanceSeries(365, 63800, 74380.50, 396, 600)
const laura2y = generateRealisticPerformanceSeries(730, 56000, 74380.50, 495, 650)
const laura5y = generateRealisticPerformanceSeries(1825, 42000, 74380.50, 594, 700)

const LAURA_POSITIONS: Position[] = [
  {
    isin: 'IE00B03HD191',
    name: 'Vanguard Global Stock Index Fund EUR Acc',
    ticker: 'VGSEI',
    domain: 'vanguard.com',
    category: 'Renta Variable Global',
    ter: 0.18,
    geo: 'Global',
    asset_type: 'fund',
    currency: 'EUR',
    shares: 980.0,
    avg_cost: 42.10,
    current_price: 52.84,
    current_value: 51783.20,
    invested_amount: 41258.00,
    unrealized_pnl: 10525.20,
    unrealized_pnl_pct: 25.51,
    weight: 69.62,
    last_updated: '2026-09-25T18:00:00Z',
  },
  {
    isin: 'IE00B18GC888',
    name: 'Vanguard Global Bond Index EUR Hedged',
    ticker: 'VGBIH',
    domain: 'vanguard.com',
    category: 'Renta Fija Global Diversificada',
    ter: 0.15,
    geo: 'Global',
    asset_type: 'bond',
    currency: 'EUR',
    shares: 310.0,
    avg_cost: 33.20,
    current_price: 36.10,
    current_value: 11191.00,
    invested_amount: 10292.00,
    unrealized_pnl: 899.00,
    unrealized_pnl_pct: 8.73,
    weight: 15.05,
    last_updated: '2026-09-25T18:00:00Z',
  },
  {
    isin: 'IE0031786696',
    name: 'Vanguard Emerging Markets Stock Index EUR',
    ticker: 'VGEMS',
    domain: 'vanguard.com',
    category: 'Renta Variable Emergentes',
    ter: 0.23,
    geo: 'Emergentes',
    asset_type: 'fund',
    currency: 'EUR',
    shares: 280.0,
    avg_cost: 23.50,
    current_price: 26.50,
    current_value: 7420.00,
    invested_amount: 6580.00,
    unrealized_pnl: 840.00,
    unrealized_pnl_pct: 12.77,
    weight: 9.98,
    last_updated: '2026-09-25T18:00:00Z',
  },
  {
    isin: 'ES0113900J37',
    name: 'Cuenta Liquidez Remunerada',
    ticker: 'CASH',
    domain: 'myinvestor.es',
    category: 'Monetario / Liquidez EUR',
    ter: 0.0,
    geo: 'Zona Euro',
    asset_type: 'fund',
    currency: 'EUR',
    shares: 3986.30,
    avg_cost: 1.0,
    current_price: 1.0,
    current_value: 3986.30,
    invested_amount: 3986.30,
    unrealized_pnl: 0.0,
    unrealized_pnl_pct: 0.0,
    weight: 5.35,
    last_updated: '2026-09-25T12:00:00Z',
  },
]

const LAURA_USER: UserProfile = {
  id: 'laura',
  name: 'Laura Gómez',
  email: 'laura@portfoliopro.app',
  avatar: 'LG',
  role: 'Inversora Indexada',
  strategy: 'Boglehead 80/20 Clásica',
  badge: 'Cartera Boglehead',
  broker: 'MyInvestor',
  isDemo: false,
  color: 'bg-violet-600 text-white',
  bgGradient: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
  passwordSalt: '9d1a4e7c2f5b8e03',
  passwordHash: '61a39502357ed3830957bd75d45510f961f9e1541d102764f09dc2509c5d6a81',
  summary: {
    total_value: 74380.50,
    total_invested: 62116.30,
    total_pnl: 12264.20,
    total_pnl_pct: 19.74,
    num_positions: LAURA_POSITIONS.length,
    last_updated: new Date().toISOString(),
  },
  positions: LAURA_POSITIONS,
  analytics: {
    twr: 18.20,
    cagr: 12.80,
    volatility: 9.40,
    max_drawdown: -6.80,
    sharpe_ratio: 1.55,
    return_ytd: 14.20,
    return_1m: 1.80,
    return_3m: 4.60,
    return_6m: 8.50,
  },
  performance: {
    '1m': laura1m,
    '1mo': laura1m,
    '3m': laura3m,
    '3mo': laura3m,
    '6m': laura6m,
    '6mo': laura6m,
    '1y': laura1y,
    '2y': laura2y,
    '5y': laura5y,
    'ytd': laura1y,
    'max': laura5y,
  },
  transactions: [
    {
      id: 'laura-1',
      isin: 'IE00B03HD191',
      name: 'Vanguard Global Stock Index Fund EUR Acc',
      type: 'buy',
      shares: 12.0,
      price: 52.84,
      amount: 634.08,
      fees: 0,
      date: '2026-09-05',
      broker: 'MyInvestor',
      notes: 'Aportación periódica mensual DCA',
    },
    {
      id: 'laura-2',
      isin: 'IE00B18GC888',
      name: 'Vanguard Global Bond Index EUR Hedged',
      type: 'buy',
      shares: 4.0,
      price: 36.10,
      amount: 144.40,
      fees: 0,
      date: '2026-09-05',
      broker: 'MyInvestor',
      notes: 'Aportación renta fija mensual',
    },
  ],
}

export const INITIAL_USER_PROFILES: UserProfile[] = [
  DEMO_USER,
  ASIER_USER,
]

export function getUserProfileById(id: string, customProfiles: UserProfile[] = []): UserProfile {
  const all = [...INITIAL_USER_PROFILES, ...customProfiles]
  return all.find((u) => u.id === id) ?? DEMO_USER
}


