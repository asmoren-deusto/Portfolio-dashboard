"""
Market Calendar Service for European & Spanish Mutual Funds (TARGET2 / BME / Euronext).
Computes official market business days, European banking holidays, and the hybrid expected
NAV liquidation date for investment portfolios.
"""
from datetime import date, datetime, timedelta
from typing import List, Optional, Set, Tuple


def get_easter_sunday(year: int) -> date:
    """Compute Easter Sunday using the Meeus/Jones/Butcher Gregorian algorithm."""
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day)


def get_market_holidays(year: int) -> Set[date]:
    """
    Return European financial market holidays (TARGET2 system calendar).
    TARGET2 operates on all weekdays except:
      1. New Year's Day (Jan 1)
      2. Good Friday (Viernes Santo)
      3. Easter Monday (Lunes de Pascua)
      4. Labour Day (May 1)
      5. Christmas Day (Dec 25)
      6. Boxing Day / St. Stephen's Day (Dec 26)
    """
    easter = get_easter_sunday(year)
    return {
        date(year, 1, 1),
        easter - timedelta(days=2),  # Good Friday
        easter + timedelta(days=1),  # Easter Monday
        date(year, 5, 1),
        date(year, 12, 25),
        date(year, 12, 26),
    }


def is_market_business_day(d: date) -> bool:
    """Return True if the date is a Monday-Friday trading/valuation day and not a TARGET2 holiday."""
    if d.weekday() in (5, 6):  # Saturday or Sunday
        return False
    holidays = get_market_holidays(d.year)
    return d not in holidays


def get_expected_nav_date(as_of: Optional[date] = None) -> str:
    """
    Calculate the minimum mandatory expected NAV liquidation date based on the system calendar.
    Because mutual funds report with a T+1 lag (overnight / next morning), on any trading day T,
    the latest officially expected closed NAV corresponds to the preceding business day (T - 1).
    """
    if as_of is None:
        as_of = date.today()

    candidate = as_of - timedelta(days=1)
    # Search backwards until hitting a valid market business day
    for _ in range(15):
        if is_market_business_day(candidate):
            return candidate.strftime("%Y-%m-%d")
        candidate -= timedelta(days=1)

    return candidate.strftime("%Y-%m-%d")


def get_effective_portfolio_nav_date(
    fund_dates: List[str],
    as_of: Optional[date] = None,
    total_active_positions: Optional[int] = None
) -> Tuple[str, bool]:
    """
    Hybrid NAV determination:
      1. Determines the base expected NAV date from the system calendar (minimum required).
      2. If today is a business day and MORE than 50% of the active funds have already published
         their official NAV for today (late night / early publication), advances the portfolio session to today.
      3. Otherwise, firmly anchors on the base expected business day, preventing isolated quotes from dragging
         the date forward.
    Returns: (effective_nav_date_str, is_advanced_to_today)
    """
    if as_of is None:
        as_of = date.today()

    today_str = as_of.strftime("%Y-%m-%d")
    base_expected = get_expected_nav_date(as_of)

    total_positions = total_active_positions or len(fund_dates)
    if total_positions <= 0:
        return base_expected, False

    # Check if today is a business day and funds have already published today's NAV
    if is_market_business_day(as_of):
        today_count = sum(1 for d in fund_dates if d and d >= today_str)
        # Advance to today ONLY if strictly more than half (> 50%) have reported today
        if today_count > (total_positions / 2.0):
            return today_str, True

    return base_expected, False
