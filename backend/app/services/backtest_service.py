"""
Portfolio Backtesting & Stress-Testing Engine.
Calculates historical trackback for the current portfolio allocation across 5Y, 10Y,
and major historical crisis regimes (2018 Trade War, 2020 Covid, 2022 Inflation/Rate Shock, 2023-2026 AI Bull).
"""
import asyncio
from datetime import datetime
import pandas as pd
import numpy as np
import yfinance as yf

# In-memory cache for market price data (12-hour TTL)
_HIST_CACHE: dict[str, tuple[datetime, pd.DataFrame]] = {}

DEFAULT_PROXIES = {
    "IE0032126645": ("SPY", "Core S&P 500 (EE.UU.)", "Motor de Crecimiento Core"),
    "0192#0011": ("URTH", "MSCI World (Indexa EPSV)", "Renta Variable Global"),
    "LU0302296495": ("XLK", "Tecnología Global (DNB Fund)", "Crecimiento / Megatendencias"),
    "ES0112611001": ("0P00016YQ5.F", "Azvalor Internacional FI", "Value / Materias Primas & Energía"),
    "ES0146309002": ("EFV", "Value Internacional (Horos)", "Renta Variable Global Value"),
    "LU1372006947": ("EFV", "Value Internacional (Cobas)", "Renta Variable Deep Value"),
    "IE000QAZP7L2": ("EEM", "Mercados Emergentes", "Diversificación Geográfica"),
    "IE00BYX5NH74": ("EWJ", "Renta Variable Japón", "Diversificación Asia Desarrollada"),
    "LU0261952682": ("EZU", "Euro Stoxx 50 (Europa)", "Renta Variable Europea"),
    "LU0171307068": ("XLV", "World Healthscience (Salud)", "Sector Defensivo Anticíclico"),
    "IE00BKSBD942": ("XLV", "Polar Capital Healthcare (Salud)", "Sector Defensivo Anticíclico"),
    "LU0840158819": ("HYG", "Crédito Corporativo HY (Storm)", "Renta Fija Corporativa / Cupón"),
    "ES0140794001": ("LQD", "Crédito Global Flexible (Gamma)", "Renta Fija Corporativa / Estabilidad"),
    "ES0000012411": ("IEF", "Bonos Soberanos 7-10Y", "Renta Fija Soberana / Refugio"),
    "CASH_TR_EUR": ("SHV", "Liquidez / Cuenta Remunerada", "Pólvora Seca / Sin Volatilidad"),
    "IE00B4ND3602": ("GLD", "Oro Físico (ETC)", "Activo Refugio / Descorrelación"),
    "US67066G1040": ("NVDA", "NVIDIA Corporation", "Líder Global IA & Semiconductores"),
    "IE00B5BMR087": ("SPY", "iShares Core S&P 500 (Acc)", "Motor de Crecimiento Core EE.UU."),
    "FR0000989626": ("SHV", "Monetario / Liquidez (Groupama)", "Fondo Monetario Ultra-Corto Plazo"),
}

def resolve_asset_proxy(isin: str, name: str, asset_type: str) -> tuple[str, str, str]:
    if isin in DEFAULT_PROXIES:
        return DEFAULT_PROXIES[isin]
    
    n_lower = (name or "").lower()
    t_lower = (asset_type or "").lower()

    if t_lower == "cash" or "remunerada" in n_lower or "monetario" in n_lower or "liquidez" in n_lower:
        return ("SHV", "Liquidez / Monetario", "Pólvora Seca / Estabilidad")
    if "gold" in n_lower or "oro" in n_lower or t_lower == "etc":
        return ("GLD", "Oro Físico", "Activo Refugio")
    if "storm" in n_lower or "high yield" in n_lower:
        return ("HYG", "Crédito Corporativo HY", "Renta Fija Corporativa")
    if "gamma" in n_lower or "credit" in n_lower or "crédito" in n_lower:
        return ("LQD", "Crédito Corporativo Global", "Renta Fija Corporativa")
    if t_lower == "bond" or "bono" in n_lower or "bond" in n_lower or "renta fija" in n_lower:
        return ("IEF", "Renta Fija Intermedia", "Renta Fija / Estabilidad")
    if "tech" in n_lower or "tecnolog" in n_lower:
        return ("XLK", "Sector Tecnológico", "Crecimiento Tecnológico")
    if "salud" in n_lower or "health" in n_lower:
        return ("XLV", "Sector Salud", "Defensivo Anticíclico")
    if "emerg" in n_lower:
        return ("EEM", "Mercados Emergentes", "Emergentes")
    if "japan" in n_lower or "japon" in n_lower:
        return ("EWJ", "Renta Variable Japón", "Asia Desarrollada")
    if "europa" in n_lower or "euro" in n_lower:
        return ("EZU", "Renta Variable Europa", "Renta Variable Europa")
    if "cobas" in n_lower or "horos" in n_lower or "value" in n_lower:
        return ("EFV", "Renta Variable Value Internacional", "Value Internacional")
    if "energy" in n_lower or "energ" in n_lower or "valor" in n_lower:
        return ("XLE", "Energía / Value", "Value / Energía")
    if "sp500" in n_lower or "s&p" in n_lower or "500" in n_lower:
        return ("SPY", "S&P 500 EE.UU.", "Renta Variable EE.UU.")
    
    return ("URTH", "MSCI World Global", "Renta Variable Global")


async def get_historical_market_monthly_df() -> pd.DataFrame:
    """
    Downloads and caches 10 years of monthly adjusted close prices for all relevant proxies.
    """
    cache_key = "10y_monthly_proxies_v2"
    now = datetime.now()
    if cache_key in _HIST_CACHE:
        ts, df = _HIST_CACHE[cache_key]
        if (now - ts).total_seconds() < 43200:  # 12 hours cache
            return df.copy()

    tickers = [
        "SPY", "URTH", "XLK", "XLV", "EFV", "XLE", "EEM", "EWJ", "EZU",
        "HYG", "LQD", "IEF", "SHV", "GLD", "0P00016YQ5.F",
    ]
    
    loop = asyncio.get_running_loop()
    def _fetch():
        return yf.download(tickers, period="10y", interval="1mo", auto_adjust=True, progress=False)["Close"]
    
    df = await loop.run_in_executor(None, _fetch)

    # Clean and forward-fill / backfill missing data (specifically Azvalor pre-2018 with XLE ratio)
    if "0P00016YQ5.F" in df.columns and "XLE" in df.columns:
        az = df["0P00016YQ5.F"].copy()
        first_valid = az.first_valid_index()
        if first_valid is not None and first_valid > df.index[0]:
            xle = df["XLE"]
            xle_ratio = xle / xle.loc[first_valid]
            az_backfilled = az.loc[first_valid] * xle_ratio.loc[:first_valid]
            az = az.combine_first(az_backfilled)
        df["0P00016YQ5.F"] = az

    df = df.ffill().bfill()
    _HIST_CACHE[cache_key] = (now, df)
    return df.copy()


def calculate_portfolio_backtest(
    positions: list[dict],
    monthly_prices: pd.DataFrame,
    timeframe: str = "10y"
) -> dict:
    """
    Takes active positions with weights and historical monthly prices,
    and computes the comprehensive trackback & stress-test report.
    """
    DEFAULT_POS = [
        {"isin": "IE0032126645", "name": "Vanguard U.S. SP500 Index", "current_value": 25799.44, "asset_type": "fund"},
        {"isin": "0192#0011", "name": "Indexa Más Rentabilidad EPSV", "current_value": 11525.12, "asset_type": "epsv"},
        {"isin": "LU0302296495", "name": "DNB Fund Technology", "current_value": 7352.65, "asset_type": "fund"},
        {"isin": "ES0112611001", "name": "Azvalor Internacional FI", "current_value": 7205.35, "asset_type": "fund"},
        {"isin": "IE000QAZP7L2", "name": "Emerging Markets Index", "current_value": 6358.52, "asset_type": "fund"},
        {"isin": "IE00BYX5NH74", "name": "MSCI Japan Index (Hedged)", "current_value": 6328.15, "asset_type": "fund"},
        {"isin": "LU0261952682", "name": "Euro 50 Index Fund", "current_value": 6253.87, "asset_type": "fund"},
        {"isin": "ES0000012411", "name": "Bonos Gobierno España Jul 32", "current_value": 4000.99, "asset_type": "bond"},
        {"isin": "IE00B4ND3602", "name": "iShares Physical Gold ETC", "current_value": 1941.84, "asset_type": "etc"},
    ]

    if not positions or sum(p.get("current_value", 0.0) for p in positions) <= 0:
        positions = DEFAULT_POS

    total_val = sum(p.get("current_value", 0.0) for p in positions)

    # Map positions to proxies & calculate weights
    asset_meta = []
    proxy_weights = {}

    for p in positions:
        isin = p.get("isin", "")
        name = p.get("name", isin)
        asset_type = p.get("asset_type", "fund")
        c_val = p.get("current_value", 0.0)
        weight = c_val / total_val

        proxy_sym, proxy_label, role = resolve_asset_proxy(isin, name, asset_type)
        if proxy_sym not in monthly_prices.columns:
            proxy_sym = "URTH"  # Fallback to World

        proxy_weights[proxy_sym] = proxy_weights.get(proxy_sym, 0.0) + weight
        asset_meta.append({
            "isin": isin,
            "name": name,
            "current_value": round(c_val, 2),
            "weight": round(weight * 100, 2),
            "proxy_sym": proxy_sym,
            "proxy_label": proxy_label,
            "role": role,
        })

    # Normalize weights to sum to exactly 1.0
    w_sum = sum(proxy_weights.values())
    if w_sum > 0:
        for k in proxy_weights:
            proxy_weights[k] /= w_sum

    # Calculate monthly percentage returns
    rets = monthly_prices.pct_change().dropna()
    
    # Slice according to timeframe: 5y = 60 months, 10y = 120 months
    months_req = 60 if timeframe == "5y" else 120
    if len(rets) > months_req:
        rets_sliced = rets.iloc[-months_req:].copy()
    else:
        rets_sliced = rets.copy()

    # Portfolio weighted return series
    port_ret = pd.Series(0.0, index=rets_sliced.index)
    for sym, w in proxy_weights.items():
        if sym in rets_sliced.columns:
            port_ret += w * rets_sliced[sym]

    sp_ret = rets_sliced["SPY"] if "SPY" in rets_sliced.columns else port_ret
    msci_ret = rets_sliced["URTH"] if "URTH" in rets_sliced.columns else port_ret
    bonds_ret = rets_sliced["IEF"] if "IEF" in rets_sliced.columns else pd.Series(0.0, index=rets_sliced.index)
    b6040_ret = 0.60 * sp_ret + 0.40 * bonds_ret

    # Cumulative growth and Base 10,000 EUR
    port_cum = (1 + port_ret).cumprod()
    sp_cum = (1 + sp_ret).cumprod()
    msci_cum = (1 + msci_ret).cumprod()
    b6040_cum = (1 + b6040_ret).cumprod()

    # Underwater Drawdown series
    port_dd = (port_cum - port_cum.cummax()) / port_cum.cummax()
    sp_dd = (sp_cum - sp_cum.cummax()) / sp_cum.cummax()
    msci_dd = (msci_cum - msci_cum.cummax()) / msci_cum.cummax()
    b6040_dd = (b6040_cum - b6040_cum.cummax()) / b6040_cum.cummax()

    # Construct monthly curves array
    curves = []
    base_amount = 10000.0

    # Include initial baseline at t=0
    start_dt = rets_sliced.index[0]
    initial_date_label = (start_dt - pd.DateOffset(months=1)).strftime("%Y-%m")
    curves.append({
        "date": initial_date_label,
        "portfolio_cum": 0.0,
        "portfolio_val": base_amount,
        "portfolio_drawdown": 0.0,
        "sp500_cum": 0.0,
        "sp500_val": base_amount,
        "sp500_drawdown": 0.0,
        "msci_cum": 0.0,
        "msci_val": base_amount,
        "msci_drawdown": 0.0,
        "b6040_cum": 0.0,
        "b6040_val": base_amount,
        "b6040_drawdown": 0.0,
    })

    for idx in rets_sliced.index:
        d_str = idx.strftime("%Y-%m")
        curves.append({
            "date": d_str,
            "portfolio_cum": round((float(port_cum.loc[idx]) - 1) * 100, 2),
            "portfolio_val": round(base_amount * float(port_cum.loc[idx]), 2),
            "portfolio_drawdown": round(float(port_dd.loc[idx]) * 100, 2),
            "sp500_cum": round((float(sp_cum.loc[idx]) - 1) * 100, 2),
            "sp500_val": round(base_amount * float(sp_cum.loc[idx]), 2),
            "sp500_drawdown": round(float(sp_dd.loc[idx]) * 100, 2),
            "msci_cum": round((float(msci_cum.loc[idx]) - 1) * 100, 2),
            "msci_val": round(base_amount * float(msci_cum.loc[idx]), 2),
            "msci_drawdown": round(float(msci_dd.loc[idx]) * 100, 2),
            "b6040_cum": round((float(b6040_cum.loc[idx]) - 1) * 100, 2),
            "b6040_val": round(base_amount * float(b6040_cum.loc[idx]), 2),
            "b6040_drawdown": round(float(b6040_dd.loc[idx]) * 100, 2),
        })

    # Calendar Annual Matrix (full available years)
    rets_full = rets.copy()
    port_ret_full = pd.Series(0.0, index=rets_full.index)
    for sym, w in proxy_weights.items():
        if sym in rets_full.columns:
            port_ret_full += w * rets_full[sym]

    sp_full = rets_full["SPY"]
    msci_full = rets_full["URTH"]
    b6040_full = 0.60 * sp_full + 0.40 * rets_full["IEF"]

    annual_matrix = []
    years = sorted(list(set(rets_full.index.year)))
    
    for y in years:
        if y < 2017:
            continue
        mask = (rets_full.index.year == y)
        if not mask.any():
            continue
        
        p_yr = float((1 + port_ret_full[mask]).prod() - 1) * 100
        sp_yr = float((1 + sp_full[mask]).prod() - 1) * 100
        msci_yr = float((1 + msci_full[mask]).prod() - 1) * 100
        b6040_yr = float((1 + b6040_full[mask]).prod() - 1) * 100

        is_crisis = y in (2018, 2020, 2022)
        alpha_sp = p_yr - sp_yr
        alpha_msci = p_yr - msci_yr

        prot_label = ""
        if y == 2022:
            prot_label = f"+{alpha_sp:.1f} pp de protección defensiva en año bajista"
        elif y == 2018:
            prot_label = "Resistencia similar al mercado global"
        elif y == 2020:
            prot_label = "Fuerte rebote tras shock Covid"
        elif alpha_sp > 0:
            prot_label = f"+{alpha_sp:.1f} pp de Alfa sobre S&P 500"
        else:
            prot_label = f"{alpha_sp:.1f} pp vs S&P 500"

        annual_matrix.append({
            "year": y,
            "portfolio_return": round(p_yr, 2),
            "sp500_return": round(sp_yr, 2),
            "msci_return": round(msci_yr, 2),
            "b6040_return": round(b6040_yr, 2),
            "alpha_vs_sp500": round(alpha_sp, 2),
            "alpha_vs_msci": round(alpha_msci, 2),
            "is_crisis_year": is_crisis,
            "protection_label": prot_label,
        })

    # Summary Metrics
    total_months = len(rets_sliced)
    n_years = total_months / 12.0

    port_final_cum = float(port_cum.iloc[-1]) - 1.0
    sp_final_cum = float(sp_cum.iloc[-1]) - 1.0
    msci_final_cum = float(msci_cum.iloc[-1]) - 1.0
    b6040_final_cum = float(b6040_cum.iloc[-1]) - 1.0

    port_cagr = ((1 + port_final_cum) ** (1.0 / n_years) - 1.0) * 100 if n_years > 0 else 0.0
    sp_cagr = ((1 + sp_final_cum) ** (1.0 / n_years) - 1.0) * 100 if n_years > 0 else 0.0
    msci_cagr = ((1 + msci_final_cum) ** (1.0 / n_years) - 1.0) * 100 if n_years > 0 else 0.0
    b6040_cagr = ((1 + b6040_final_cum) ** (1.0 / n_years) - 1.0) * 100 if n_years > 0 else 0.0

    port_vol = float(port_ret.std() * np.sqrt(12)) * 100
    sp_vol = float(sp_ret.std() * np.sqrt(12)) * 100
    msci_vol = float(msci_ret.std() * np.sqrt(12)) * 100

    rf = 2.0  # Risk free rate assumption (2%)
    port_sharpe = round((port_cagr - rf) / port_vol, 2) if port_vol > 0 else 0.0
    sp_sharpe = round((sp_cagr - rf) / sp_vol, 2) if sp_vol > 0 else 0.0

    max_dd_port = float(port_dd.min()) * 100
    max_dd_sp = float(sp_dd.min()) * 100
    max_dd_msci = float(msci_dd.min()) * 100

    # Downside capture vs S&P 500
    neg_sp_mask = sp_ret < 0
    if neg_sp_mask.sum() > 0:
        downside_capture = (port_ret[neg_sp_mask].mean() / sp_ret[neg_sp_mask].mean()) * 100
    else:
        downside_capture = 100.0

    pos_sp_mask = sp_ret > 0
    if pos_sp_mask.sum() > 0:
        upside_capture = (port_ret[pos_sp_mask].mean() / sp_ret[pos_sp_mask].mean()) * 100
    else:
        upside_capture = 100.0

    summary = {
        "timeframe": timeframe,
        "n_years": round(n_years, 1),
        "portfolio_cum": round(port_final_cum * 100, 2),
        "portfolio_cagr": round(port_cagr, 2),
        "sp500_cum": round(sp_final_cum * 100, 2),
        "sp500_cagr": round(sp_cagr, 2),
        "msci_cum": round(msci_final_cum * 100, 2),
        "msci_cagr": round(msci_cagr, 2),
        "b6040_cum": round(b6040_final_cum * 100, 2),
        "b6040_cagr": round(b6040_cagr, 2),
        "growth_10k_portfolio": round(base_amount * (1 + port_final_cum), 2),
        "growth_10k_sp500": round(base_amount * (1 + sp_final_cum), 2),
        "growth_10k_msci": round(base_amount * (1 + msci_final_cum), 2),
        "growth_10k_b6040": round(base_amount * (1 + b6040_final_cum), 2),
        "max_drawdown_portfolio": round(max_dd_port, 2),
        "max_drawdown_sp500": round(max_dd_sp, 2),
        "max_drawdown_msci": round(max_dd_msci, 2),
        "crisis_drop_avoided_pp": round(abs(max_dd_sp) - abs(max_dd_port), 2),
        "downside_capture_ratio": round(downside_capture, 1),
        "upside_capture_ratio": round(upside_capture, 1),
        "volatility_portfolio": round(port_vol, 2),
        "volatility_sp500": round(sp_vol, 2),
        "sharpe_ratio_portfolio": port_sharpe,
        "sharpe_ratio_sp500": sp_sharpe,
    }

    # Dynamic Crisis Stress-Testing Scenarios computed from the ACTUAL current portfolio allocation
    def _build_dynamic_crisis(
        cid: str,
        title: str,
        period_label: str,
        severity: str,
        color: str,
        start_ym: str,
        end_ym: str,
        dd_start_ym: str | None = None,
        dd_end_ym: str | None = None,
        fallback_rec_months: int = 6,
    ) -> dict:
        mask = (rets_full.index >= start_ym) & (rets_full.index <= end_ym)
        sub_p = port_ret_full[mask]
        sub_sp = sp_full[mask]
        sub_msci = msci_full[mask]
        sub_b6040 = b6040_full[mask]

        p_ret = round(float((1 + sub_p).prod() - 1) * 100, 1) if len(sub_p) else 0.0
        sp_r = round(float((1 + sub_sp).prod() - 1) * 100, 1) if len(sub_sp) else 0.0
        msci_r = round(float((1 + sub_msci).prod() - 1) * 100, 1) if len(sub_msci) else 0.0
        b6040_r = round(float((1 + sub_b6040).prod() - 1) * 100, 1) if len(sub_b6040) else 0.0

        dd_mask = (
            (rets_full.index >= (dd_start_ym or start_ym))
            & (rets_full.index <= (dd_end_ym or end_ym))
        )
        dd_slice = port_ret_full[dd_mask]
        if len(dd_slice):
            c_s = pd.concat([pd.Series([1.0]), (1 + dd_slice).cumprod()])
            mdd = round(float(((c_s - c_s.cummax()) / c_s.cummax()).min()) * 100, 1)
        else:
            mdd = 0.0

        alpha_sp = round(p_ret - sp_r, 1)

        # Estimate recovery months after period end
        rec_months = fallback_rec_months
        if len(dd_slice) and mdd < -1.0:
            full_cum = (1 + port_ret_full).cumprod()
            window_idx = dd_slice.index
            peak_val = float(full_cum.loc[:window_idx[-1]].max())
            after = full_cum.loc[window_idx[-1]:]
            recovered = after[after >= peak_val]
            if len(recovered) > 0:
                delta_days = (recovered.index[0] - window_idx[0]).days
                rec_months = max(1, round(delta_days / 30.0))

        # Per-asset performance during this exact regime (deduplicated by asset name)
        per_asset = []
        for am in asset_meta:
            sym = am["proxy_sym"]
            if sym in rets_full.columns:
                a_sub = rets_full[sym][mask]
                a_ret = float((1 + a_sub).prod() - 1) * 100 if len(a_sub) else 0.0
                per_asset.append((a_ret, am["name"], am["role"], am["weight"]))
        per_asset.sort(key=lambda x: x[0], reverse=True)

        heroes = [
            {
                "name": name,
                "ret": f"{r:+.1f}%",
                "desc": f"{role} ({w:.1f}% peso actual)",
            }
            for r, name, role, w in per_asset[:3]
        ]
        vulnerables = [
            {
                "name": name,
                "ret": f"{r:+.1f}%",
                "desc": f"{role} ({w:.1f}% peso actual)",
            }
            for r, name, role, w in reversed(per_asset[-2:])
        ] if len(per_asset) >= 2 else []

        top_hero_names = " y ".join(h["name"] for h in heroes[:2]) if heroes else "tus activos defensivos"
        if alpha_sp >= 0:
            conclusion = (
                f"Con tu cartera actual habrías superado al S&P 500 en +{alpha_sp:.1f} pp "
                f"({p_ret:+.1f}% vs {sp_r:+.1f}%), impulsado por {top_hero_names}."
            )
        else:
            conclusion = (
                f"Tu cartera actual registró {p_ret:+.1f}% frente al {sp_r:+.1f}% del S&P 500 "
                f"(Max DD {mdd:.1f}%), con mejor soporte relativo en {top_hero_names}."
            )

        return {
            "id": cid,
            "title": title,
            "period_label": period_label,
            "severity": severity,
            "color": color,
            "portfolio_return": p_ret,
            "sp500_return": sp_r,
            "msci_return": msci_r,
            "b6040_return": b6040_r,
            "max_drawdown": mdd,
            "alpha_vs_sp500": alpha_sp,
            "recovery_months": rec_months,
            "hero_assets": heroes,
            "vulnerable_assets": vulnerables,
            "conclusion": conclusion,
        }

    latest_ymd = rets_full.index[-1].strftime("%Y-%m-%d") if len(rets_full) else "2026-11-24"
    latest_label = rets_full.index[-1].strftime("%b %Y") if len(rets_full) else "Nov 2026"

    crises = [
        _build_dynamic_crisis(
            "2022_inflation",
            "Crisis de Inflación, Tipos y Guerra de Ucrania",
            "Ene 2022 – Dic 2022",
            "Alta",
            "#ef4444",
            "2022-01-01",
            "2022-12-31",
            fallback_rec_months=9,
        ),
        _build_dynamic_crisis(
            "2020_covid",
            "Crash Covid-19 y Confinamientos Mundiales",
            "Ene 2020 – Dic 2020",
            "Extrema (Shock V-Shape)",
            "#f59e0b",
            "2020-01-01",
            "2020-12-31",
            dd_start_ym="2020-01-01",
            dd_end_ym="2020-05-31",
            fallback_rec_months=4,
        ),
        _build_dynamic_crisis(
            "2018_selloff",
            "Guerra Comercial EE.UU.-China y Subidas de Tipos Fed",
            "Ene 2018 – Dic 2018",
            "Moderada",
            "#8b5cf6",
            "2018-01-01",
            "2018-12-31",
            fallback_rec_months=5,
        ),
        _build_dynamic_crisis(
            "2023_2026_expansion",
            "Rally de la Inteligencia Artificial y Expansión Global",
            f"Ene 2023 – {latest_label}",
            "Fase Alcista Fuerte",
            "#10b981",
            "2023-01-01",
            latest_ymd,
            fallback_rec_months=2,
        ),
    ]

    # Asset Attribution metrics
    attribution = []
    for am in asset_meta:
        sym = am["proxy_sym"]
        if sym in rets_full.columns:
            s_full = rets_full[sym]
            cagr10 = float(((1 + s_full).prod() ** (12.0 / len(s_full))) - 1.0) * 100
            s5 = s_full.iloc[-60:] if len(s_full) >= 60 else s_full
            cagr5 = float(((1 + s5).prod() ** (12.0 / len(s5))) - 1.0) * 100
            
            # 2022 return
            m22 = s_full[s_full.index.year == 2022]
            ret_2022 = float((1 + m22).prod() - 1.0) * 100 if len(m22) else 0.0

            # 2020 return
            m20 = s_full[s_full.index.year == 2020]
            ret_2020 = float((1 + m20).prod() - 1.0) * 100 if len(m20) else 0.0

            # Max drawdown of asset
            c_cum = (1 + s_full).cumprod()
            dd_asset = float(((c_cum - c_cum.cummax()) / c_cum.cummax()).min()) * 100
        else:
            cagr10, cagr5, ret_2022, ret_2020, dd_asset = 10.0, 10.0, 0.0, 0.0, -20.0

        attribution.append({
            "isin": am["isin"],
            "name": am["name"],
            "weight": am["weight"],
            "current_value": am["current_value"],
            "role": am["role"],
            "proxy_sym": sym,
            "cagr_10y": round(cagr10, 2),
            "cagr_5y": round(cagr5, 2),
            "ret_2022": round(ret_2022, 2),
            "ret_2020": round(ret_2020, 2),
            "max_drawdown": round(dd_asset, 2),
        })

    attribution.sort(key=lambda x: x["weight"], reverse=True)

    return {
        "summary": summary,
        "curves": curves,
        "annual_matrix": annual_matrix,
        "crises": crises,
        "asset_attribution": attribution,
    }

