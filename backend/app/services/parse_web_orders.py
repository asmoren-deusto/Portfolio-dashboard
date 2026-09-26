"""
Parser for MyInvestor Web Orders text + CSV correlation.
Correlates the web text (which contains the operation type: Suscripcion vs Reembolso)
with the CSV (which contains the exact ISINs).
"""
import re
import unicodedata
from datetime import datetime

ISIN_NAME_MAP = {
    "azvalor": "ES0112611001",
    "fidelity funds - euro stoxx 50": "LU0261952682",
    "euro stoxx 50": "LU0261952682",
    "ishares developed world": "IE000ZYRH0Q7",
    "developed world": "IE000ZYRH0Q7",
    "ishares emerging markets": "IE000QAZP7L2",
    "emerging markets": "IE000QAZP7L2",
    "robeco smart energy": "LU2145461757",
    "smart energy": "LU2145461757",
    "polar capital global technology": "IE00BM95B621",
    "polar capital": "IE00BM95B621",
    "fidelity msci japan": "IE00BYX5NH74",
    "msci japan": "IE00BYX5NH74",
    "dnb technology": "LU0302296495",
    "carmignac portfolio credit": "LU1623762843",
    "carmignac": "LU1623762843",
}

KNOWN_NAMES = {
    "ES0112611001": "Azvalor Internacional FI",
    "LU0261952682": "Fidelity Euro 50 Index Fund A-ACC-EUR",
    "IE000ZYRH0Q7": "iShares Developed World Index (IE) S Acc EUR",
    "IE000QAZP7L2": "iShares Emerging Markets Index (IE) S Acc EUR",
    "LU2145461757": "Robeco Capital Growth - Robeco Smart Energy D EUR",
    "IE00BM95B621": "Polar Capital Global Technology Fund R Acc",
    "IE00BYX5NH74": "Fidelity MSCI Japan Index Fund",
    "LU0302296495": "DNB Fund - Technology",
    "LU1623762843": "Carmignac Portfolio Credit A EUR Acc",
}


def clean_str(s: str) -> str:
    if not s:
        return ""
    text = unicodedata.normalize("NFKD", str(s)).encode("ASCII", "ignore").decode("utf-8")
    return text.lower().strip()


def parse_web_text(text: str) -> list[dict]:
    """Parse MyInvestor web copied text into structured operations."""
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    operations = []
    current_date = None
    i = 0

    while i < len(lines):
        line = lines[i]
        # Check if line is a date (DD/MM/YYYY)
        if re.match(r"^\d{2}/\d{2}/\d{4}$", line):
            current_date = line
            i += 1
            continue

        # Look for operation type
        l_clean = clean_str(line)
        if any(kw in l_clean for kw in ["suscripcion", "reembolso", "bloqueo"]):
            op_type_raw = line
            # Next line should be amount
            amount_str = lines[i + 1] if i + 1 < len(lines) else ""
            fund_name_raw = lines[i + 2] if i + 2 < len(lines) else ""
            status = lines[i + 3] if i + 3 < len(lines) else ""
            shares_str = lines[i + 4] if i + 4 < len(lines) else ""

            # Check if status is actually in lines[i+3]
            s_clean = clean_str(status)
            if s_clean not in ["finalizada", "cancelada", "rechazada", "pendiente"]:
                # Maybe structure was shifted, advance 1 line and re-evaluate
                i += 1
                continue

            # Determine type
            if "reembolso" in l_clean:
                op_type = "sell"
            elif "suscripcion" in l_clean:
                op_type = "buy"
            else:
                op_type = "other"  # e.g. bloqueo

            # Clean fund name (remove Puntual / Periodica at end)
            fund_name = re.sub(r"(?i)(puntual|periodica|periódica)$", "", fund_name_raw).strip()

            # Parse amount: "116,72 €" or "6.284,42 €"
            amt_clean = re.sub(r"[^\d,\.]", "", amount_str).strip()
            if "." in amt_clean and "," in amt_clean:
                amt_clean = amt_clean.replace(".", "").replace(",", ".")
            elif "," in amt_clean:
                amt_clean = amt_clean.replace(",", ".")
            try:
                amount = float(amt_clean) if amt_clean else 0.0
            except ValueError:
                amount = 0.0

            # Parse shares: "0,345743 participaciones" or "4 participaciones" or "-"
            sh_clean = re.sub(r"[^\d,\.]", "", shares_str).strip()
            if "." in sh_clean and "," in sh_clean:
                sh_clean = sh_clean.replace(".", "").replace(",", ".")
            elif "," in sh_clean:
                sh_clean = sh_clean.replace(",", ".")
            try:
                shares = float(sh_clean) if sh_clean else 0.0
            except ValueError:
                shares = 0.0

            # Determine ISIN from fund name
            fname_clean = clean_str(fund_name)
            isin = None
            for key, val in ISIN_NAME_MAP.items():
                if key in fname_clean:
                    isin = val
                    break

            dp = current_date.split("/") if current_date else []
            formatted_date = f"{dp[2]}-{dp[1]}-{dp[0]}" if len(dp) == 3 else current_date

            operations.append({
                "date": formatted_date,
                "type": op_type,
                "raw_type": op_type_raw,
                "fund_name": fund_name,
                "isin": isin,
                "amount": amount,
                "shares": shares,
                "status": s_clean,
            })

            i += 5
            continue

        i += 1

    return operations
