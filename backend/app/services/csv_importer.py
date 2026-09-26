"""
CSV / Excel importer for MyInvestor and Spanish brokers format.
Supports:
- CSV (semicolon, comma, tab separated)
- Excel (.xlsx, .xls)
- Encoding: UTF-8 (with/without BOM), Latin-1, Windows-1252
- Automatic detection of header row (skipping metadata/title lines)
- Flexible column matching for Spanish financial terms
- Automatic ISIN regex fallback if column is unlabelled
- Automatic calculation of missing shares or price
"""
import csv
import io
import re
import logging
import unicodedata
from datetime import datetime

logger = logging.getLogger(__name__)

ISIN_REGEX = re.compile(r"\b([A-Z]{2}[A-Z0-9]{9}\d)\b")


def _clean_str(s: any) -> str:
    if s is None:
        return ""
    text = str(s).strip().lower()
    text = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8")
    return re.sub(r"[^a-z0-9]", "", text)


def _match_column(col_name: any) -> str | None:
    c = _clean_str(col_name)
    if not c:
        return None
    if "isin" in c or "codigovalor" in c or "codvalor" in c:
        return "isin"
    if "fecha" in c or "date" in c:
        return "date"
    if any(k in c for k in ["participaci", "titulo", "titulos", "shares", "cantidad", "part"]):
        return "shares"
    if any(k in c for k in ["precio", "liquidativo", "vl", "cotizacion", "cambio", "nav", "costemedio", "price"]):
        return "price"
    if any(k in c for k in ["importe", "efectivo", "total", "amount", "valoracion", "neto"]):
        return "amount"
    if any(k in c for k in ["tipo", "operacion", "concepto", "movimiento", "clase", "type"]):
        return "type"
    if any(k in c for k in ["fondo", "nombre", "descripcion", "producto", "activo", "instrumento", "valor"]):
        return "name"
    return None


def _parse_date(date_str: any) -> str | None:
    if not date_str:
        return None
    s = str(date_str).strip()
    # If date contains time e.g. "2024-03-20 12:00:00" or "20/03/2024 10:15"
    s = s.split()[0].replace("/", "-")
    parts = s.split("-")
    if len(parts) == 3:
        if len(parts[0]) == 4:  # YYYY-MM-DD
            try:
                y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
                return f"{y:04d}-{m:02d}-{d:02d}"
            except ValueError:
                pass
        elif len(parts[2]) == 4:  # DD-MM-YYYY
            try:
                d, m, y = int(parts[0]), int(parts[1]), int(parts[2])
                return f"{y:04d}-{m:02d}-{d:02d}"
            except ValueError:
                pass
        elif len(parts[2]) == 2:  # DD-MM-YY
            try:
                d, m, y = int(parts[0]), int(parts[1]), int(parts[2]) + 2000
                return f"{y:04d}-{m:02d}-{d:02d}"
            except ValueError:
                pass

    formats = ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%y", "%Y/%m/%d"]
    for fmt in formats:
        try:
            return datetime.strptime(str(date_str).strip().split()[0], fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def _parse_number(val: any) -> float:
    if val is None or val == "":
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace("€", "").replace("%", "").replace("$", "").replace(" ", "").strip()
    if not s:
        return 0.0
    is_neg = False
    if s.startswith("-") or (s.startswith("(") and s.endswith(")")):
        is_neg = True
        s = s.strip("-()")
    if "." in s and "," in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        num = float(s)
        return -num if is_neg else num
    except ValueError:
        return 0.0


def _parse_type(raw_type: any) -> str:
    c = _clean_str(raw_type)
    if any(k in c for k in ["suscrip", "compra", "aportac", "entrada"]):
        return "buy"
    if any(k in c for k in ["reembolso", "venta", "salida"]):
        return "sell"
    if any(k in c for k in ["dividendo", "rendimiento", "abono"]):
        return "dividend"
    if "traspaso" in c:
        return "transfer"
    return "buy"


def parse_myinvestor_csv(content: bytes | str, filename: str = "") -> list[dict]:
    """
    Parse MyInvestor CSV, TSV, or Excel export.
    Returns list of normalized transaction dicts.
    """
    # 1. Check if binary Excel (.xlsx or .xls)
    is_excel = False
    if isinstance(content, bytes):
        if content.startswith(b"PK\x03\x04") or filename.lower().endswith((".xlsx", ".xlsm")):
            is_excel = True

    if is_excel:
        return _parse_excel(content)

    # 2. Text / CSV parsing
    text = ""
    if isinstance(content, bytes):
        for enc in ("utf-8-sig", "utf-8", "latin-1", "cp1252", "iso-8859-1"):
            try:
                text = content.decode(enc)
                break
            except Exception:
                continue
        if not text:
            text = content.decode("utf-8", errors="replace")
    else:
        text = content

    lines = [line for line in text.splitlines() if line.strip()]
    if not lines:
        logger.warning("Empty file uploaded")
        return []

    # Detect header row
    header_idx = -1
    sep = ";"
    for i, line in enumerate(lines[:25]):
        l_lower = line.lower()
        if "isin" in l_lower or (("fecha" in l_lower or "date" in l_lower) and any(w in l_lower for w in ["operac", "part", "titul", "import"])):
            header_idx = i
            # Determine separator from header line
            counts = {";": line.count(";"), ",": line.count(","), "\t": line.count("\t")}
            sep = max(counts, key=counts.get)
            if counts[sep] == 0:
                sep = ";"
            break

    if header_idx == -1:
        # Fallback to first line
        header_idx = 0
        sep = ";" if lines[0].count(";") >= lines[0].count(",") else ("," if lines[0].count(",") > 0 else "\t")

    logger.info(f"Using CSV header on line {header_idx} with sep '{sep}': {lines[header_idx]}")

    csv_data = "\n".join(lines[header_idx:])
    reader = csv.reader(io.StringIO(csv_data), delimiter=sep)
    rows = list(reader)
    if not rows or len(rows) < 2:
        return []

    raw_headers = rows[0]
    col_mapping = {}
    for col_idx, h in enumerate(raw_headers):
        field = _match_column(h)
        if field and field not in col_mapping:
            col_mapping[field] = col_idx

    logger.info(f"Mapped columns: {col_mapping}")
    transactions = []

    for r_idx, row in enumerate(rows[1:], start=header_idx + 2):
        if not row or not any(row):
            continue
        try:
            tx = _build_tx_from_cells(row, col_mapping)
            if tx:
                transactions.append(tx)
        except Exception as e:
            logger.warning(f"Row {r_idx} parse error: {e}")

    logger.info(f"Parsed {len(transactions)} transactions successfully")
    return transactions


def _parse_excel(content: bytes) -> list[dict]:
    """Parse binary Excel file (.xlsx) into transactions."""
    try:
        import pandas as pd
        df = pd.read_excel(io.BytesIO(content), header=None)
    except Exception as e:
        logger.error(f"Failed to read Excel with pandas: {e}")
        return []

    if df.empty or len(df) < 2:
        return []

    # Find header row
    header_idx = -1
    for i in range(min(25, len(df))):
        row_str = " ".join([str(val).lower() for val in df.iloc[i] if pd.notna(val)])
        if "isin" in row_str or (("fecha" in row_str or "date" in row_str) and any(w in row_str for w in ["operac", "part", "titul", "import"])):
            header_idx = i
            break

    if header_idx == -1:
        header_idx = 0

    raw_headers = [str(x) if pd.notna(x) else "" for x in df.iloc[header_idx]]
    col_mapping = {}
    for col_idx, h in enumerate(raw_headers):
        field = _match_column(h)
        if field and field not in col_mapping:
            col_mapping[field] = col_idx

    logger.info(f"Excel header on row {header_idx}, mapped: {col_mapping}")
    transactions = []

    for r_idx in range(header_idx + 1, len(df)):
        row = [str(x) if pd.notna(x) else "" for x in df.iloc[r_idx]]
        if not any(row):
            continue
        tx = _build_tx_from_cells(row, col_mapping)
        if tx:
            transactions.append(tx)

    return transactions


def _build_tx_from_cells(row: list[str], col_mapping: dict[str, int]) -> dict | None:
    """Build a normalized transaction dict from a row of cell values."""
    def get_val(field: str) -> str:
        idx = col_mapping.get(field)
        if idx is not None and idx < len(row):
            return str(row[idx]).strip()
        return ""

    isin = get_val("isin").upper()
    # If ISIN not in designated column, search row values with regex
    if not isin or len(isin) < 12:
        for cell in row:
            m = ISIN_REGEX.search(str(cell))
            if m:
                isin = m.group(1).upper()
                break

    if not isin or len(isin) < 12:
        return None

    name = get_val("name")
    if not name:
        # Check if another cell has fund name
        for cell in row:
            c_str = str(cell).strip()
            if len(c_str) > 4 and isin not in c_str and not _parse_date(c_str) and _parse_number(c_str) == 0:
                name = c_str
                break

    date_str = get_val("date")
    parsed_date = _parse_date(date_str)
    if not parsed_date:
        # Default to today if date not present (e.g. current positions export)
        parsed_date = datetime.now().strftime("%Y-%m-%d")

    raw_type = get_val("type")
    tx_type = _parse_type(raw_type)

    shares = abs(_parse_number(get_val("shares")))
    price = abs(_parse_number(get_val("price")))
    amount = abs(_parse_number(get_val("amount")))

    # Calculate missing values
    if shares == 0 and price > 0 and amount > 0:
        shares = round(amount / price, 4)
    elif price == 0 and shares > 0 and amount > 0:
        price = round(amount / shares, 4)
    elif amount == 0 and shares > 0 and price > 0:
        amount = round(shares * price, 2)

    if shares == 0 and amount == 0:
        return None

    return {
        "isin": isin,
        "name": name,
        "type": tx_type,
        "shares": shares,
        "price": price,
        "amount": amount,
        "fees": 0.0,
        "date": parsed_date,
        "broker": "myinvestor",
        "notes": "Imported from file",
    }
