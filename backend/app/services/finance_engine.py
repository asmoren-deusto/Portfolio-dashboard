"""
Finance engine — calculates portfolio metrics using pandas/numpy.
Handles: TWR, MWR/IRR, Sharpe, Max Drawdown, CAGR, volatility.
"""
import numpy as np
import pandas as pd
from datetime import datetime, date
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def is_internal_traspaso(notes: str) -> bool:
    """
    Determine if a transaction note represents an internal fund-to-fund transfer
    within the portfolio (e.g. 'reembolso por traspaso interno', 'suscripción por traspaso interno',
    'traspaso fondo en contra', 'traspaso fondos a favor', 'suscripción por traspaso externo (desde bbva...)'),
    as opposed to an external capital movement (e.g. 'traspaso de entrada desde Trade Republic').
    """
    if not notes:
        return False
    n = notes.lower()
    if "traspaso" not in n:
        return False
    if "desde bbva" in n or "a cobas" in n or "desde cobas" in n or "desde amundi" in n:
        return True
    if any(k in n for k in ("traspaso de entrada", "entrada desde", "salida a", "aportaci")):
        return False
    return True


def calculate_traspaso_balances(transactions: list[dict]) -> dict[str, dict[str, float]]:
    """
    Computes both market value in transit and deferred fiscal cost basis in transit per broker.
    Preserves historical fiscal base cost (coste fiscal originario) and accumulated plusvalía
    during internal transfers with tax deferral (diferimiento fiscal).
    Returns: {broker: {"market_value": float, "cost_basis": float, "pnl": float}}
    """
    positions: dict[str, dict] = {}
    broker_sells_market: dict[str, float] = {}
    broker_sells_cost: dict[str, float] = {}
    broker_buys_market: dict[str, float] = {}
    broker_buys_cost: dict[str, float] = {}

    for tx in sorted(transactions, key=lambda x: x["date"]):
        isin = tx["isin"]
        broker = (tx.get("broker") or "myinvestor").lower()
        if broker in ("trade_republic", "traderepublic"):
            continue

        if isin not in positions:
            positions[isin] = {"shares": 0.0, "total_cost": 0.0}
        pos = positions[isin]

        notes = (tx.get("notes") or "").lower()
        is_traspaso = is_internal_traspaso(notes)

        # Track source broker for cross-broker fund transfers
        src_broker = broker
        if is_traspaso and tx["type"] == "buy":
            if "desde bbva" in notes:
                src_broker = "bbva"
            elif "desde myinvestor" in notes:
                src_broker = "myinvestor"
            elif "desde indexa" in notes:
                src_broker = "indexa"

        if tx["type"] == "buy":
            pos["shares"] += tx["shares"]
            pos["total_cost"] += tx["amount"]
            if is_traspaso:
                broker_buys_market[src_broker] = broker_buys_market.get(src_broker, 0.0) + tx["amount"]
                pending_market = max(0.0, broker_sells_market.get(src_broker, 0.0) - (broker_buys_market.get(src_broker, 0.0) - tx["amount"]))
                pending_cost = max(0.0, broker_sells_cost.get(src_broker, 0.0) - broker_buys_cost.get(src_broker, 0.0))
                if pending_market > 0 and pending_cost > 0:
                    absorbed_cost = min(pending_cost, (tx["amount"] / pending_market) * pending_cost)
                else:
                    absorbed_cost = tx["amount"]
                broker_buys_cost[src_broker] = broker_buys_cost.get(src_broker, 0.0) + absorbed_cost
        elif tx["type"] == "sell":
            shares_before = pos["shares"]
            cost_before = pos["total_cost"]
            sold_shares = tx["shares"]
            if shares_before > 0:
                cost_of_sold_shares = min(cost_before, (sold_shares / shares_before) * cost_before)
            else:
                cost_of_sold_shares = 0.0

            pos["shares"] = max(0.0, pos["shares"] - sold_shares)
            pos["total_cost"] = max(0.0, pos["total_cost"] - cost_of_sold_shares)

            if is_traspaso:
                broker_sells_market[broker] = broker_sells_market.get(broker, 0.0) + tx["amount"]
                broker_sells_cost[broker] = broker_sells_cost.get(broker, 0.0) + cost_of_sold_shares

    results = {}
    all_b = set(broker_sells_market.keys()) | set(broker_buys_market.keys())
    for b in all_b:
        m_sell = broker_sells_market.get(b, 0.0)
        m_buy = broker_buys_market.get(b, 0.0)
        c_sell = broker_sells_cost.get(b, 0.0)
        c_buy = broker_buys_cost.get(b, 0.0)

        cit_market = max(0.0, m_sell - m_buy)
        cit_cost = max(0.0, c_sell - c_buy)
        if cit_market > 0.001 or cit_cost > 0.001:
            results[b] = {
                "market_value": cit_market,
                "cost_basis": cit_cost,
                "pnl": cit_market - cit_cost,
            }
    return results


def calculate_positions(transactions: list[dict]) -> dict[str, dict]:
    """
    Calculate current positions from transaction history.
    Returns: {isin: {shares, avg_cost, invested_amount, transactions}}
    """
    positions: dict[str, dict] = {}

    for tx in sorted(transactions, key=lambda x: x["date"]):
        isin = tx["isin"]
        if isin not in positions:
            positions[isin] = {"shares": 0.0, "total_cost": 0.0, "transactions": []}

        pos = positions[isin]
        if tx["type"] == "buy":
            pos["shares"] += tx["shares"]
            pos["total_cost"] += tx["amount"]
        elif tx["type"] == "sell":
            pos["shares"] -= tx["shares"]
            # Reduce cost proportionally
            if pos["shares"] > 0:
                pos["total_cost"] -= (tx["shares"] / (pos["shares"] + tx["shares"])) * pos["total_cost"]
            else:
                pos["total_cost"] = 0.0
        pos["transactions"].append(tx)

    # Calculate avg_cost per share
    for isin, pos in positions.items():
        pos["avg_cost"] = pos["total_cost"] / pos["shares"] if pos["shares"] > 0 else 0
        pos["invested_amount"] = pos["total_cost"]

    # Remove fully sold positions
    return {isin: pos for isin, pos in positions.items() if pos["shares"] > 0.001}


def calculate_portfolio_value_series(
    transactions: list[dict],
    price_history: dict[str, list[dict]],
    start_date: str | None = None,
) -> list[dict]:
    """
    Reconstruct portfolio value over time.
    transactions: list of all transactions
    price_history: {isin: [{"date": str, "price": float}]}
    start_date: Optional ISO date string (YYYY-MM-DD) to truncate earlier history
    Returns: [{"date": str, "value": float, "invested": float}]
    """
    if not transactions:
        return []

    # Build price series per asset
    all_dates = set()
    price_frames: dict[str, pd.Series] = {}

    for isin, history in (price_history or {}).items():
        if not history:
            continue
        s = pd.Series(
            {h["date"]: h["price"] for h in history},
            name=isin,
        )
        s.index = pd.to_datetime(s.index)
        price_frames[isin] = s
        all_dates.update(s.index)

    tx_sorted = sorted(transactions, key=lambda x: x["date"])
    first_tx_date = pd.to_datetime(tx_sorted[0]["date"])
    all_dates.add(first_tx_date)
    all_dates.add(pd.to_datetime(tx_sorted[-1]["date"]))
    today = pd.to_datetime(datetime.now().date())
    if today >= first_tx_date:
        all_dates.add(today)

    date_range = pd.date_range(min(all_dates), max(all_dates), freq="B")  # business days

    # Pre-build instantaneous O(1) price lookup table: price_lookup[isin][date_str]
    # Forward-fills historical prices and back-fills earliest price, perfectly matching original fallback logic
    price_lookup: dict[str, dict[str, float]] = {}
    for isin, s in price_frames.items():
        aligned = s.reindex(date_range).ffill().bfill()
        price_lookup[isin] = {str(d.date()): float(v) for d, v in aligned.items()}

    # For each date, calculate portfolio value, true daily market return, and net capital inflows
    portfolio_values = []
    current_active_tx = []
    current_positions = {}
    pending_txs = list(tx_sorted)
    prev_positions = None
    prev_total_val = None
    prev_cit = 0.0

    for d in date_range:
        d_str = str(d.date())

        # Incrementally update transactions and positions
        has_new_tx = False
        txs_today = []
        while pending_txs and pending_txs[0]["date"] <= d_str:
            tx = pending_txs.pop(0)
            current_active_tx.append(tx)
            txs_today.append(tx)
            has_new_tx = True

        if not current_active_tx:
            continue

        if has_new_tx or not current_positions:
            current_positions = calculate_positions(current_active_tx)

        positions = current_positions
        total = 0.0

        for isin, pos in positions.items():
            if isin == "TR_TRANSFER" or isin.startswith("TR_"):
                continue
            price = price_lookup.get(isin, {}).get(d_str)
            if price is None or price <= 0:
                price = pos.get("avg_cost", 0)
            total += pos["shares"] * price

        # Account for cash in transit and deferred fiscal cost basis in transit during internal fund transfers
        tb = calculate_traspaso_balances(current_active_tx)
        cash_in_transit = sum(d["market_value"] for d in tb.values())
        cost_in_transit = sum(d["cost_basis"] for d in tb.values())
        total += cash_in_transit

        # Exact active invested capital as of this date (held positions cost basis + deferred cost basis in transit)
        active_invested = sum(
            pos["invested_amount"] for isin, pos in positions.items()
            if pos["shares"] > 0.0001 and isin != "TR_TRANSFER" and not isin.startswith("TR_")
        ) + cost_in_transit

        # Net external cash inflow on this day (buys add external capital, sells remove capital, traspasos remain inside portfolio)
        day_inflow = 0.0
        for tx in txs_today:
            if is_internal_traspaso(tx.get("notes") or "") or (tx.get("isin") or "").startswith("TR_"):
                continue
            if tx["type"] == "buy":
                day_inflow += tx["amount"]
            elif tx["type"] == "sell":
                day_inflow -= tx["amount"]

        # Calculate pure market return for the day, isolated from any buy/sell cash flow
        daily_return = 0.0
        if prev_positions is not None and prev_total_val is not None and prev_total_val > 0:
            val_market_prev = 0.0
            for isin, pos in prev_positions.items():
                if isin == "TR_TRANSFER" or isin.startswith("TR_"):
                    continue
                price = price_lookup.get(isin, {}).get(d_str)
                if price is None or (price <= 0 and isin != "TR_TRANSFER"):
                    price = pos.get("avg_cost", 0)
                val_market_prev += pos["shares"] * price
            val_market_prev += prev_cit
            r_t = (val_market_prev / prev_total_val) - 1.0
            daily_return = round(r_t * 100, 4)

        prev_positions = {k: dict(v) for k, v in positions.items()}
        prev_total_val = total
        prev_cit = cash_in_transit

        if start_date and d_str < start_date:
            continue

        # Entity / Broker breakdown
        distinct_brokers = set((tx.get("broker") or "myinvestor").lower() for tx in current_active_tx)
        brokers_data = {}
        for b in sorted(distinct_brokers):
            b_tx = [tx for tx in current_active_tx if (tx.get("broker") or "myinvestor").lower() == b]
            if not b_tx:
                continue
            b_positions = calculate_positions(b_tx)
            b_val = 0.0
            b_inv = 0.0
            for isin, pos in b_positions.items():
                if isin.startswith("TR_") or pos.get("shares", 0) <= 0.0001:
                    continue
                price = price_lookup.get(isin, {}).get(d_str)
                if price is None or (price <= 0 and isin != "TR_TRANSFER"):
                    price = pos.get("avg_cost", 0)
                b_val += pos["shares"] * price
                b_inv += pos["invested_amount"]

            b_traspaso = tb.get(b, {})
            b_val += b_traspaso.get("market_value", 0.0)
            b_inv += b_traspaso.get("cost_basis", 0.0)

            if b_val > 0 or b_inv > 0:
                brokers_data[b] = {
                    "value": round(b_val, 2),
                    "invested": round(b_inv, 2),
                }

        if total > 0:
            portfolio_values.append({
                "date": d_str,
                "value": round(total, 2),
                "invested": round(active_invested, 2),
                "daily_return": daily_return,
                "net_inflow": round(day_inflow, 2),
                "brokers": brokers_data,
            })

    return portfolio_values


def calculate_portfolio_nav_series(
    transactions: list[dict],
    price_history: dict[str, list[dict]],
) -> list[dict]:
    """
    Computes a true time-weighted unit NAV series (starting at 100.0)
    immune to cash injections and withdrawals.
    """
    if not transactions:
        return []

    price_frames: dict[str, pd.Series] = {}
    all_dates = set()
    for isin, history in (price_history or {}).items():
        if not history:
            continue
        s = pd.Series({h["date"]: h["price"] for h in history}, name=isin)
        s.index = pd.to_datetime(s.index)
        price_frames[isin] = s
        all_dates.update(s.index)

    tx_sorted = sorted(transactions, key=lambda x: x["date"])
    first_tx_date = pd.to_datetime(tx_sorted[0]["date"])
    all_dates.add(first_tx_date)
    all_dates.add(pd.to_datetime(tx_sorted[-1]["date"]))
    today = pd.to_datetime(datetime.now().date())
    if today >= first_tx_date:
        all_dates.add(today)

    date_range = pd.date_range(min(all_dates), max(all_dates), freq="B")

    price_lookup: dict[str, dict[str, float]] = {}
    for isin, s in price_frames.items():
        aligned = s.reindex(date_range).ffill().bfill()
        price_lookup[isin] = {str(d.date()): float(v) for d, v in aligned.items()}

    nav = 100.0
    nav_series = []
    prev_positions = None
    prev_total_val = None
    prev_cit = 0.0

    current_active_tx = []
    current_positions = {}
    pending_txs = list(tx_sorted)

    for d in date_range:
        d_str = str(d.date())
        has_new_tx = False
        while pending_txs and pending_txs[0]["date"] <= d_str:
            current_active_tx.append(pending_txs.pop(0))
            has_new_tx = True

        if not current_active_tx:
            continue

        if has_new_tx or not current_positions:
            current_positions = calculate_positions(current_active_tx)

        cur_positions = current_positions
        cur_total_val = 0.0
        for isin, pos in cur_positions.items():
            price = price_lookup.get(isin, {}).get(d_str)
            if price is None or (price <= 0 and isin != "TR_TRANSFER"):
                price = pos.get("avg_cost", 0)
            cur_total_val += pos["shares"] * price

        # Account for cash in transit during internal fund transfers (traspasos)
        tb = calculate_traspaso_balances(current_active_tx)
        cash_in_transit = sum(d["market_value"] for d in tb.values())
        cur_total_val += cash_in_transit

        if cur_total_val <= 0:
            continue

        if prev_positions is not None and prev_total_val is not None and prev_total_val > 0:
            val_market_prev = 0.0
            for isin, pos in prev_positions.items():
                price = price_lookup.get(isin, {}).get(d_str)
                if price is None or (price <= 0 and isin != "TR_TRANSFER"):
                    price = pos.get("avg_cost", 0)
                val_market_prev += pos["shares"] * price
            val_market_prev += prev_cit

            r_t = (val_market_prev / prev_total_val) - 1.0
            r_t = max(-0.15, min(0.15, r_t))
            nav = nav * (1.0 + r_t)
            nav_series.append({"date": d_str, "nav": round(nav, 4), "daily_return": r_t})
        else:
            nav_series.append({"date": d_str, "nav": 100.0, "daily_return": 0.0})

        prev_positions = cur_positions
        prev_total_val = cur_total_val
        prev_cit = cash_in_transit

    return nav_series


def calculate_twr(nav_series: list[dict], transactions: list[dict] = None) -> Optional[float]:
    """Time-Weighted Return from unit NAV series."""
    if len(nav_series) < 2:
        return None
    try:
        first = nav_series[0]["nav"]
        last = nav_series[-1]["nav"]
        if first <= 0:
            return None
        twr = (last / first - 1.0) * 100.0
        return round(float(twr), 2)
    except Exception as e:
        logger.warning(f"TWR calculation error: {e}")
        return None


def calculate_cagr(nav_series: list[dict]) -> Optional[float]:
    """Compound Annual Growth Rate from unit NAV series."""
    if len(nav_series) < 2:
        return None
    try:
        first = nav_series[0]
        last = nav_series[-1]
        d1 = datetime.fromisoformat(first["date"])
        d2 = datetime.fromisoformat(last["date"])
        years = (d2 - d1).days / 365.25
        if years <= 0 or first["nav"] <= 0:
            return None
        cagr = ((last["nav"] / first["nav"]) ** (1.0 / years) - 1.0) * 100.0
        return round(float(cagr), 2)
    except Exception as e:
        logger.warning(f"CAGR error: {e}")
        return None


def calculate_volatility(nav_series: list[dict]) -> Optional[float]:
    """Annualized volatility of unit NAV daily returns."""
    if len(nav_series) < 20:
        return None
    try:
        returns = pd.Series([n.get("daily_return", 0.0) for n in nav_series[1:]])
        vol = returns.std() * np.sqrt(252) * 100.0
        return round(float(vol), 2)
    except Exception as e:
        logger.warning(f"Volatility error: {e}")
        return None


def calculate_max_drawdown(nav_series: list[dict]) -> Optional[float]:
    """Maximum drawdown from peak of unit NAV."""
    if len(nav_series) < 2:
        return None
    try:
        values = pd.Series([n["nav"] for n in nav_series])
        rolling_max = values.cummax()
        drawdown = (values - rolling_max) / rolling_max
        max_dd = float(drawdown.min()) * 100.0
        return round(max_dd, 2)
    except Exception as e:
        logger.warning(f"Max drawdown error: {e}")
        return None


def calculate_sharpe(nav_series: list[dict], risk_free_rate: float = 2.5) -> Optional[float]:
    """Sharpe ratio vs risk-free rate."""
    if len(nav_series) < 20:
        return None
    try:
        cagr = calculate_cagr(nav_series)
        vol = calculate_volatility(nav_series)
        if cagr is None or vol is None or vol <= 0:
            return None
        sharpe = (cagr - risk_free_rate) / vol
        return round(float(sharpe), 2)
    except Exception as e:
        logger.warning(f"Sharpe error: {e}")
        return None


def calculate_period_return(value_series: list[dict], days: int) -> Optional[float]:
    """Return for last N days (using nav if available for true TWR, otherwise value)."""
    if not value_series or len(value_series) < 2:
        return None
    try:
        key = "nav" if "nav" in value_series[-1] else "value"
        if days <= 1:
            prev = value_series[-2][key]
            curr = value_series[-1][key]
            return round(float((curr / prev - 1) * 100), 2) if prev and prev > 0 else 0.0

        last_date_str = value_series[-1].get("date")
        if last_date_str:
            last_date = pd.to_datetime(last_date_str)
            cutoff = last_date - pd.Timedelta(days=days)
        else:
            cutoff = pd.Timestamp.now() - pd.Timedelta(days=days)
        cutoff_str = str(cutoff.date())
        pts_before = [
            v for v in value_series
            if v.get("date") and v["date"] <= cutoff_str and v.get(key) is not None and v[key] > 0
        ]
        base_pt = pts_before[-1] if pts_before else value_series[0]
        last_pt = value_series[-1]

        base_val = base_pt.get(key)
        last_val = last_pt.get(key)
        if base_val and last_val and base_val > 0:
            ret = (last_val / base_val - 1) * 100
            return round(float(ret), 2)
        return None
    except Exception as e:
        logger.warning(f"Period return error: {e}")
        return None


def calculate_xirr(
    transactions: list[dict],
    current_value: float,
    as_of_date: Optional[str] = None,
) -> Optional[float]:
    """
    Calculate Money-Weighted Return / Internal Rate of Return (TIR / XIRR)
    from external cash flows (buys as negative flows, sells as positive flows,
    excluding internal fund transfers 'traspasos'), with current portfolio value
    as the final terminal positive inflow.
    """
    if not transactions or current_value <= 0:
        return None

    flows: list[tuple[str, float]] = []
    for tx in transactions:
        # Ignore non-portfolio transfer placeholders
        if (tx.get("isin") or "").startswith("TR_"):
            continue

        notes = tx.get("notes") or ""
        if is_internal_traspaso(notes):
            continue

        amt = float(tx.get("amount") or 0.0)
        if amt <= 0:
            continue
        tx_type = tx.get("type")
        d_str = str(tx.get("date") or "")[:10]
        if not d_str:
            continue
        if tx_type == "buy":
            flows.append((d_str, -amt))
        elif tx_type == "sell":
            flows.append((d_str, amt))

    if not flows:
        return None

    flows.sort(key=lambda x: x[0])
    terminal_date = as_of_date or datetime.now().strftime("%Y-%m-%d")
    flows.append((terminal_date, float(current_value)))

    d0 = datetime.fromisoformat(flows[0][0])

    def npv(rate: float) -> float:
        total = 0.0
        for d_str, cf in flows:
            dt = (datetime.fromisoformat(d_str) - d0).days / 365.25
            try:
                denom = (1.0 + rate) ** dt
                if denom == 0:
                    return float("inf")
                total += cf / denom
            except (OverflowError, ZeroDivisionError):
                return float("inf")
        return total

    # Search for root using bisection method
    low, high = -0.99, 10.0
    val_low = npv(low)
    val_high = npv(high)

    if val_low * val_high > 0:
        low, high = -0.5, 2.0
        val_low = npv(low)
        val_high = npv(high)
        if val_low * val_high > 0:
            return None

    for _ in range(150):
        mid = (low + high) / 2.0
        val_mid = npv(mid)
        if abs(val_mid) < 1e-4:
            return round(mid * 100.0, 2)
        if val_low * val_mid < 0:
            high = mid
            val_high = val_mid
        else:
            low = mid
            val_low = val_mid

    return round(((low + high) / 2.0) * 100.0, 2)


def calculate_position_xirr(
    pos_transactions: list[dict],
    current_value: float,
    as_of_date: Optional[str] = None,
) -> Optional[float]:
    """
    Calculate Money-Weighted Return (TIR / XIRR) for an individual position.
    Considers all cash flows for this instrument (buys as negative, sells/dividends as positive)
    with current market value as terminal positive flow.
    """
    if not pos_transactions or current_value <= 0:
        return None

    flows: list[tuple[str, float]] = []
    for tx in pos_transactions:
        amt = float(tx.get("amount") or 0.0)
        if amt <= 0:
            continue
        d_str = str(tx.get("date") or "")[:10]
        if not d_str:
            continue
        tx_type = tx.get("type")
        if tx_type == "buy":
            flows.append((d_str, -amt))
        elif tx_type in ("sell", "dividend"):
            flows.append((d_str, amt))

    if not flows:
        return None

    flows.sort(key=lambda x: x[0])
    terminal_date = as_of_date or datetime.now().strftime("%Y-%m-%d")
    flows.append((terminal_date, float(current_value)))

    if not (any(cf < 0 for _, cf in flows) and any(cf > 0 for _, cf in flows)):
        return None

    d0 = datetime.fromisoformat(flows[0][0])
    total_days = (datetime.fromisoformat(terminal_date) - d0).days
    if total_days < 14:
        return None

    def npv(rate: float) -> float:
        total = 0.0
        for d_str, cf in flows:
            dt = (datetime.fromisoformat(d_str) - d0).days / 365.25
            try:
                denom = (1.0 + rate) ** dt
                if denom == 0:
                    return float("inf")
                total += cf / denom
            except (OverflowError, ZeroDivisionError):
                return float("inf")
        return total

    low, high = -0.95, 5.0
    val_low = npv(low)
    val_high = npv(high)
    if val_low * val_high > 0:
        low, high = -0.5, 2.0
        val_low = npv(low)
        val_high = npv(high)
        if val_low * val_high > 0:
            return None

    for _ in range(120):
        mid = (low + high) / 2.0
        val_mid = npv(mid)
        if abs(val_mid) < 1e-4:
            return round(mid * 100.0, 2)
        if val_low * val_mid < 0:
            high = mid
            val_high = val_mid
        else:
            low = mid
            val_low = val_mid

    return round(((low + high) / 2.0) * 100.0, 2)


def calculate_enhanced_kpis(
    transactions: list[dict],
    current_value: float,
    as_of_date: Optional[str] = None,
) -> dict:
    """
    Computes Rumbo-inspired top-level KPIs:
    - irr: Global money-weighted annualized return (TIR/XIRR).
    - realized_pnl: Already cashed-in capital gains from external sales (FIFO) + dividends.
    - monthly_pace: Average monthly gross contributions over the last 12 months with activity.
    - contribution_streak_months: Number of consecutive months with contributions.
    - total_contributions_count: Total external buys made.
    """
    if not transactions:
        return {
            "irr": None,
            "realized_pnl": 0.0,
            "monthly_pace": 0.0,
            "contribution_streak_months": 0,
            "total_contributions_count": 0,
        }

    irr = calculate_xirr(transactions, current_value, as_of_date=as_of_date)

    pos_fifo: dict[str, dict[str, float]] = {}
    realized_pnl = 0.0
    external_buys_count = 0
    monthly_inflows: dict[str, float] = {}
    months_with_buys: set[str] = set()

    for tx in sorted(transactions, key=lambda x: str(x.get("date") or "")):
        isin = tx.get("isin") or ""
        if isin.startswith("TR_"):
            continue

        is_tr = is_internal_traspaso(tx.get("notes") or "")
        amt = float(tx.get("amount") or 0.0)
        shares = float(tx.get("shares") or 0.0)
        tx_type = tx.get("type")
        d_str = str(tx.get("date") or "")[:10]
        ym = d_str[:7] if len(d_str) >= 7 else None

        if isin not in pos_fifo:
            pos_fifo[isin] = {"shares": 0.0, "total_cost": 0.0}
        pos = pos_fifo[isin]

        if tx_type == "buy":
            pos["shares"] += shares
            pos["total_cost"] += amt
            if not is_tr:
                external_buys_count += 1
                if ym:
                    months_with_buys.add(ym)
                    monthly_inflows[ym] = monthly_inflows.get(ym, 0.0) + amt
        elif tx_type == "sell":
            sh_before = pos["shares"]
            cost_before = pos["total_cost"]
            cost_of_sold = (shares / sh_before * cost_before) if sh_before > 0 else 0.0

            pos["shares"] = max(0.0, sh_before - shares)
            pos["total_cost"] = max(0.0, cost_before - cost_of_sold)

            if not is_tr:
                pnl_sale = amt - cost_of_sold
                realized_pnl += pnl_sale
                if ym:
                    monthly_inflows[ym] = monthly_inflows.get(ym, 0.0) - amt
        elif tx_type == "dividend":
            realized_pnl += amt
            if ym and not is_tr:
                monthly_inflows[ym] = monthly_inflows.get(ym, 0.0) + amt

    sorted_ym = sorted(monthly_inflows.keys())
    recent_12 = sorted_ym[-12:] if len(sorted_ym) >= 12 else sorted_ym
    monthly_pace = round(sum(max(0.0, monthly_inflows[m]) for m in recent_12) / len(recent_12), 2) if recent_12 else 0.0

    streak = 0
    now = datetime.now()
    curr_m = now.strftime("%Y-%m")
    check_dt = now

    while True:
        ym = check_dt.strftime("%Y-%m")
        if ym in months_with_buys:
            streak += 1
            first_day = check_dt.replace(day=1)
            prev_m_day = first_day.replace(
                month=first_day.month - 1 if first_day.month > 1 else 12,
                year=first_day.year if first_day.month > 1 else first_day.year - 1
            )
            check_dt = prev_m_day
        else:
            if streak == 0 and ym == curr_m:
                first_day = check_dt.replace(day=1)
                prev_m_day = first_day.replace(
                    month=first_day.month - 1 if first_day.month > 1 else 12,
                    year=first_day.year if first_day.month > 1 else first_day.year - 1
                )
                check_dt = prev_m_day
                continue
            break

    return {
        "irr": irr,
        "realized_pnl": round(realized_pnl, 2),
        "monthly_pace": monthly_pace,
        "contribution_streak_months": streak,
        "total_contributions_count": external_buys_count,
    }



