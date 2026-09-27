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
) -> list[dict]:
    """
    Reconstruct portfolio value over time.
    transactions: list of all transactions
    price_history: {isin: [{"date": str, "price": float}]}
    Returns: [{"date": str, "value": float}]
    """
    if not transactions:
        return []

    # Build price DataFrame per asset
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

    date_range = pd.date_range(min(all_dates), max(all_dates), freq="B")  # business days

    # For each date, calculate portfolio value
    portfolio_values = []

    for d in date_range:
        d_str = str(d.date())
        # Get positions as of this date
        active_tx = [tx for tx in tx_sorted if tx["date"] <= d_str]
        if not active_tx:
            continue

        positions = calculate_positions(active_tx)
        total = 0.0

        for isin, pos in positions.items():
            price = None
            if isin in price_frames:
                series = price_frames[isin]
                available = series[series.index <= d]
                if not available.empty:
                    price = float(available.iloc[-1])
                elif not series.empty:
                    price = float(series.iloc[0])
            if not price or price <= 0:
                price = pos.get("avg_cost", 0)
            total += pos["shares"] * price

        # Account for cash in transit during internal fund transfers (traspasos internos).
        # A sale for traspaso takes 3-4 business days to be booked into the destination fund.
        traspaso_sells = sum(tx["amount"] for tx in active_tx if tx["type"] == "sell" and "traspaso" in (tx.get("notes") or "").lower())
        traspaso_buys = sum(tx["amount"] for tx in active_tx if tx["type"] == "buy" and "traspaso" in (tx.get("notes") or "").lower())
        cash_in_transit = max(0.0, traspaso_sells - traspaso_buys)
        total += cash_in_transit

        # Cumulative net external capital contributed (Dinero aportado durante el tiempo)
        net_invested = 0.0
        for tx in active_tx:
            is_traspaso = "traspaso" in (tx.get("notes") or "").lower()
            if not is_traspaso:
                if tx["type"] == "buy":
                    net_invested += tx["amount"]
                elif tx["type"] == "sell":
                    net_invested -= tx["amount"]

        if total > 0:
            portfolio_values.append({
                "date": d_str,
                "value": round(total, 2),
                "invested": round(net_invested, 2),
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

    date_range = pd.date_range(min(all_dates), max(all_dates), freq="B")

    nav = 100.0
    nav_series = []
    prev_positions = None
    prev_total_val = None

    for d in date_range:
        d_str = str(d.date())
        active_tx = [tx for tx in tx_sorted if tx["date"] <= d_str]
        if not active_tx:
            continue

        cur_positions = calculate_positions(active_tx)
        cur_total_val = 0.0
        for isin, pos in cur_positions.items():
            price = None
            if isin in price_frames:
                s = price_frames[isin]
                avail = s[s.index <= d]
                if not avail.empty:
                    price = float(avail.iloc[-1])
                elif not s.empty:
                    price = float(s.iloc[0])
            if not price or price <= 0:
                price = pos.get("avg_cost", 0)
            cur_total_val += pos["shares"] * price

        if cur_total_val <= 0:
            continue

        if prev_positions is not None and prev_total_val is not None and prev_total_val > 0:
            val_market_prev = 0.0
            for isin, pos in prev_positions.items():
                price = None
                if isin in price_frames:
                    s = price_frames[isin]
                    avail = s[s.index <= d]
                    if not avail.empty:
                        price = float(avail.iloc[-1])
                    elif not s.empty:
                        price = float(s.iloc[0])
                if not price or price <= 0:
                    price = pos.get("avg_cost", 0)
                val_market_prev += pos["shares"] * price

            r_t = (val_market_prev / prev_total_val) - 1.0
            r_t = max(-0.15, min(0.15, r_t))
            nav = nav * (1.0 + r_t)
            nav_series.append({"date": d_str, "nav": round(nav, 4), "daily_return": r_t})
        else:
            nav_series.append({"date": d_str, "nav": 100.0, "daily_return": 0.0})

        prev_positions = cur_positions
        prev_total_val = cur_total_val

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
    """Return for last N days."""
    if len(value_series) < 2:
        return None
    try:
        cutoff = pd.Timestamp.now() - pd.Timedelta(days=days)
        cutoff_str = str(cutoff.date())
        filtered = [v for v in value_series if v["date"] >= cutoff_str]
        if len(filtered) < 2:
            return None
        ret = (filtered[-1]["value"] / filtered[0]["value"] - 1) * 100
        return round(float(ret), 2)
    except Exception as e:
        logger.warning(f"Period return error: {e}")
        return None

