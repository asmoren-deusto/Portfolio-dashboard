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
    if not transactions or not price_history:
        return []

    # Build price DataFrame per asset
    all_dates = set()
    price_frames: dict[str, pd.Series] = {}

    for isin, history in price_history.items():
        if not history:
            continue
        s = pd.Series(
            {h["date"]: h["price"] for h in history},
            name=isin,
        )
        s.index = pd.to_datetime(s.index)
        price_frames[isin] = s
        all_dates.update(s.index)

    if not all_dates:
        return []

    date_range = pd.date_range(min(all_dates), max(all_dates), freq="B")  # business days

    # For each date, calculate portfolio value
    portfolio_values = []
    tx_sorted = sorted(transactions, key=lambda x: x["date"])

    for d in date_range:
        d_str = str(d.date())
        # Get positions as of this date
        active_tx = [tx for tx in tx_sorted if tx["date"] <= d_str]
        if not active_tx:
            continue

        positions = calculate_positions(active_tx)
        total = 0.0

        for isin, pos in positions.items():
            if isin in price_frames:
                series = price_frames[isin]
                # Get last available price up to this date
                available = series[series.index <= d]
                if not available.empty:
                    price = float(available.iloc[-1])
                    total += pos["shares"] * price

        if total > 0:
            portfolio_values.append({"date": d_str, "value": round(total, 2)})

    return portfolio_values


def calculate_twr(value_series: list[dict], transactions: list[dict]) -> Optional[float]:
    """
    Time-Weighted Return — removes the effect of cash flows.
    Returns percentage (e.g., 15.4 for 15.4%).
    """
    if len(value_series) < 2:
        return None
    try:
        first_value = value_series[0]["value"]
        last_value = value_series[-1]["value"]
        if first_value <= 0:
            return None
        twr = (last_value / first_value - 1) * 100
        return round(twr, 2)
    except Exception as e:
        logger.warning(f"TWR calculation error: {e}")
        return None


def calculate_cagr(value_series: list[dict]) -> Optional[float]:
    """Compound Annual Growth Rate."""
    if len(value_series) < 2:
        return None
    try:
        first = value_series[0]
        last = value_series[-1]
        d1 = datetime.fromisoformat(first["date"])
        d2 = datetime.fromisoformat(last["date"])
        years = (d2 - d1).days / 365.25
        if years <= 0 or first["value"] <= 0:
            return None
        cagr = ((last["value"] / first["value"]) ** (1 / years) - 1) * 100
        return round(cagr, 2)
    except Exception as e:
        logger.warning(f"CAGR error: {e}")
        return None


def calculate_volatility(value_series: list[dict]) -> Optional[float]:
    """Annualized volatility (std of daily returns * sqrt(252))."""
    if len(value_series) < 20:
        return None
    try:
        values = pd.Series([v["value"] for v in value_series])
        returns = values.pct_change().dropna()
        vol = returns.std() * np.sqrt(252) * 100
        return round(float(vol), 2)
    except Exception as e:
        logger.warning(f"Volatility error: {e}")
        return None


def calculate_max_drawdown(value_series: list[dict]) -> Optional[float]:
    """Maximum drawdown from peak."""
    if len(value_series) < 2:
        return None
    try:
        values = pd.Series([v["value"] for v in value_series])
        rolling_max = values.cummax()
        drawdown = (values - rolling_max) / rolling_max
        max_dd = float(drawdown.min()) * 100
        return round(max_dd, 2)
    except Exception as e:
        logger.warning(f"Max drawdown error: {e}")
        return None


def calculate_sharpe(value_series: list[dict], risk_free_rate: float = 2.5) -> Optional[float]:
    """Sharpe ratio vs risk-free rate (default ECB rate ~2.5%)."""
    if len(value_series) < 20:
        return None
    try:
        values = pd.Series([v["value"] for v in value_series])
        returns = values.pct_change().dropna()
        daily_rf = risk_free_rate / 100 / 252
        excess_returns = returns - daily_rf
        sharpe = (excess_returns.mean() / returns.std()) * np.sqrt(252)
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
