"""
CSV importer for MyInvestor export format.
MyInvestor allows exporting transaction history as CSV/Excel.
"""
import csv
import io
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# MyInvestor CSV column mappings (adjust based on actual export format)
MYINVESTOR_COLUMNS = {
    "fecha": "date",
    "fecha operación": "date",
    "isin": "isin",
    "fondo": "name",
    "nombre": "name",
    "participaciones": "shares",
    "número de participaciones": "shares",
    "precio": "price",
    "valor liquidativo": "price",
    "importe": "amount",
    "importe total": "amount",
    "tipo": "type",
    "operación": "type",
}

TYPE_MAP = {
    "suscripción": "buy",
    "compra": "buy",
    "reembolso": "sell",
    "venta": "sell",
    "traspaso entrada": "buy",
    "traspaso salida": "sell",
    "dividendo": "dividend",
    "transferencia": "transfer",
}


def parse_myinvestor_csv(content: bytes | str) -> list[dict]:
    """
    Parse MyInvestor CSV export.
    Returns list of normalized transaction dicts.
    """
    if isinstance(content, bytes):
        # Try UTF-8 first, then latin-1 (common in Spanish exports)
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            text = content.decode("latin-1")
    else:
        text = content

    # Auto-detect separator (comma or semicolon — Spanish exports often use semicolons)
    sep = ";" if text.count(";") > text.count(",") else ","

    reader = csv.DictReader(io.StringIO(text), delimiter=sep)
    transactions = []

    for i, row in enumerate(reader):
        try:
            tx = _parse_row(row)
            if tx:
                transactions.append(tx)
        except Exception as e:
            logger.warning(f"Row {i} parse error: {e} — row: {row}")

    logger.info(f"Parsed {len(transactions)} transactions from CSV")
    return transactions


def _parse_row(row: dict) -> dict | None:
    """Normalize a single CSV row to our transaction schema."""
    normalized = {}

    for raw_col, raw_val in row.items():
        col_lower = raw_col.strip().lower()
        if col_lower in MYINVESTOR_COLUMNS:
            normalized[MYINVESTOR_COLUMNS[col_lower]] = raw_val.strip() if raw_val else ""

    if not normalized.get("isin") or not normalized.get("shares"):
        return None

    # Parse date
    date_str = normalized.get("date", "")
    parsed_date = _parse_date(date_str)
    if not parsed_date:
        return None

    # Parse numbers (Spanish format: 1.234,56 → 1234.56)
    shares = _parse_number(normalized.get("shares", "0"))
    price = _parse_number(normalized.get("price", "0"))
    amount = _parse_number(normalized.get("amount", "0"))

    if amount == 0 and shares and price:
        amount = shares * price

    # Normalize type
    tx_type_raw = normalized.get("type", "buy").lower()
    tx_type = TYPE_MAP.get(tx_type_raw, "buy")

    return {
        "isin": normalized.get("isin", "").upper().strip(),
        "type": tx_type,
        "shares": abs(shares),
        "price": abs(price),
        "amount": abs(amount),
        "fees": 0.0,
        "date": parsed_date,
        "broker": "myinvestor",
        "notes": f"Imported from CSV",
    }


def _parse_date(date_str: str) -> str | None:
    """Parse various date formats to YYYY-MM-DD."""
    formats = ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%y", "%Y/%m/%d"]
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def _parse_number(s: str) -> float:
    """Parse Spanish-format numbers: 1.234,56 → 1234.56"""
    if not s:
        return 0.0
    s = s.strip().replace("€", "").replace("%", "").strip()
    # If both . and , present: . is thousands separator, , is decimal
    if "." in s and "," in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0
