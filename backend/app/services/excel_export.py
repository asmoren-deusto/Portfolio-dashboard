"""
excel_export.py — Servicio de generación y formateo profesional de archivos Excel (.xlsx)
para Portfolio Dashboard.

Soporta:
1. Posiciones en cartera con métricas completas, estilos ejecutivos y fórmulas de totales.
2. Histórico de rendimientos diarios (serie temporal, plusvalía, rendimiento diario, flujos y brokers).
3. Historial de transacciones y operaciones detalladas.
4. Libro multi-pestaña consolidado ('Informe Completo').
"""
import io
from datetime import datetime
from typing import Any, Optional

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter


# ── Paleta cromática ejecutiva y fuentes ─────────────────────────────────────
FONT_FAMILY = "Segoe UI"
COLOR_NAVY = "1E293B"       # Cabeceras principales (slate-800)
COLOR_WHITE = "FFFFFF"
COLOR_ZEBRA = "F8FAFC"      # Filas alternas sutiles (slate-50)
COLOR_BORDER = "E2E8F0"     # Borde estándar suave (slate-200)
COLOR_BORDER_TOTAL = "94A3B8"# Borde superior de fila totales (slate-400)
COLOR_GREEN = "15803D"      # Texto positivo (emerald-700)
COLOR_RED = "B91C1C"        # Texto negativo (rose-700)
COLOR_TOTAL_BG = "F1F5F9"   # Fondo fila totales (slate-100)

FILL_HEADER = PatternFill(start_color=COLOR_NAVY, end_color=COLOR_NAVY, fill_type="solid")
FILL_ZEBRA = PatternFill(start_color=COLOR_ZEBRA, end_color=COLOR_ZEBRA, fill_type="solid")
FILL_TOTAL = PatternFill(start_color=COLOR_TOTAL_BG, end_color=COLOR_TOTAL_BG, fill_type="solid")

FONT_TITLE = Font(name=FONT_FAMILY, size=15, bold=True, color="0F172A")
FONT_SUBTITLE = Font(name=FONT_FAMILY, size=9.5, italic=True, color="64748B")
FONT_HEADER = Font(name=FONT_FAMILY, size=10, bold=True, color=COLOR_WHITE)
FONT_DATA = Font(name=FONT_FAMILY, size=9.5, color="1E293B")
FONT_TOTAL = Font(name=FONT_FAMILY, size=10, bold=True, color="0F172A")
FONT_GREEN = Font(name=FONT_FAMILY, size=9.5, bold=True, color=COLOR_GREEN)
FONT_RED = Font(name=FONT_FAMILY, size=9.5, bold=True, color=COLOR_RED)

BORDER_CELL = Border(
    left=Side(style="thin", color=COLOR_BORDER),
    right=Side(style="thin", color=COLOR_BORDER),
    top=Side(style="thin", color=COLOR_BORDER),
    bottom=Side(style="thin", color=COLOR_BORDER),
)

BORDER_TOTAL = Border(
    left=Side(style="thin", color=COLOR_BORDER),
    right=Side(style="thin", color=COLOR_BORDER),
    top=Side(style="thin", color=COLOR_BORDER_TOTAL),
    bottom=Side(style="double", color=COLOR_NAVY),
)

# ── Formatos numéricos nativos de Excel ───────────────────────────────────────
FMT_CURRENCY = '#,##0.00 "€"'
FMT_CURRENCY_4 = '#,##0.0000 "€"'
FMT_SHARES = '#,##0.0000'
FMT_PERCENT = '+0.00%;-0.00%;0.00%'
FMT_PERCENT_UNSIGNED = '0.00%'
FMT_DATE = 'YYYY-MM-DD'
FMT_INTEGER = '#,##0'


def _to_dict(obj: Any) -> dict:
    """Convierte con seguridad diccionarios, modelos Pydantic o modelos SQLAlchemy a dict."""
    if isinstance(obj, dict):
        return obj
    if hasattr(obj, "model_dump") and callable(obj.model_dump):
        return obj.model_dump()
    if hasattr(obj, "dict") and callable(obj.dict):
        return obj.dict()
    if hasattr(obj, "__table__"):
        res = {c.name: getattr(obj, c.name, None) for c in obj.__table__.columns}
        if hasattr(obj, "asset") and obj.asset:
            res["asset_name"] = getattr(obj.asset, "name", None)
        return res
    return getattr(obj, "__dict__", {})


def _autofit_columns(ws, min_width: int = 12, max_width: int = 45):
    """Ajusta automáticamente el ancho de cada columna para evitar truncados y '###'."""
    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = 0
        for cell in col:
            # Ignorar filas de título y subtítulo en el cálculo de ancho
            if cell.row in (1, 2):
                continue
            val = cell.value
            if val is not None:
                # Si es fórmula, usar aproximación de longitud
                str_val = str(val)
                if str_val.startswith("="):
                    str_val = "123,456.78 €"
                max_len = max(max_len, len(str_val))
        ws.column_dimensions[col_letter].width = min(max(max_len + 3.5, min_width), max_width)


def _format_broker_name(broker: Optional[str]) -> str:
    """Convierte el slug del broker a un nombre legible corporativo."""
    if not broker or broker.lower() in ("all", "todos"):
        return "Consolidado (Todos los brokers)"
    mapping = {
        "myinvestor": "MyInvestor",
        "bbva": "BBVA",
        "indexa": "Indexa Capital",
        "indexacapital": "Indexa Capital",
        "traderepublic": "Trade Republic",
        "trade_republic": "Trade Republic",
        "degiro": "DEGIRO",
        "scalable": "Scalable Capital",
        "kutxabank": "Kutxabank",
    }
    clean = broker.lower().replace("-", "").replace("_", "")
    return mapping.get(clean, broker.capitalize())


def _format_asset_type(asset_type: Optional[str]) -> str:
    mapping = {
        "fund": "Fondo Indexado / Inversión",
        "stock": "Acción al Contado",
        "etf": "ETF Cotizado",
        "crypto": "Criptoactivo",
        "cash": "Liquidez / Traspaso",
        "pension": "Plan de Pensiones / EPSV",
    }
    return mapping.get((asset_type or "").lower(), (asset_type or "Fondo").capitalize())


def create_positions_sheet(ws, positions: list[dict | Any], broker: Optional[str] = None):
    """Rellena una hoja con la tabla completa y profesional de posiciones."""
    ws.title = "Posiciones"
    ws.views.sheetView[0].showGridLines = True

    # 1. Título y Metadatos
    ws["A1"] = "PORTFOLIOPRO — POSICIONES EN CARTERA"
    ws["A1"].font = FONT_TITLE
    now_str = datetime.now().strftime("%d/%m/%Y %H:%M")
    b_name = _format_broker_name(broker)
    ws["A2"] = f"Entidad: {b_name}   |   Fecha de exportación: {now_str}   |   Moneda base: EUR (€)   |   Total posiciones activas: {len(positions)}"
    ws["A2"].font = FONT_SUBTITLE
    ws.row_dimensions[1].height = 24
    ws.row_dimensions[2].height = 18

    # 2. Cabeceras
    headers = [
        ("Activo / Instrumento", Alignment(horizontal="left", vertical="center")),
        ("ISIN", Alignment(horizontal="center", vertical="center")),
        ("Ticker", Alignment(horizontal="center", vertical="center")),
        ("Tipo de Activo", Alignment(horizontal="left", vertical="center")),
        ("Broker", Alignment(horizontal="center", vertical="center")),
        ("Títulos / Participaciones", Alignment(horizontal="right", vertical="center")),
        ("Precio Medio Compra", Alignment(horizontal="right", vertical="center")),
        ("Última Cotización / NAV", Alignment(horizontal="right", vertical="center")),
        ("Capital Invertido", Alignment(horizontal="right", vertical="center")),
        ("Valor de Mercado", Alignment(horizontal="right", vertical="center")),
        ("Plusvalía Latente (€)", Alignment(horizontal="right", vertical="center")),
        ("Rentabilidad Latente (%)", Alignment(horizontal="right", vertical="center")),
        ("Variación Diaria (%)", Alignment(horizontal="right", vertical="center")),
        ("Peso Cartera (%)", Alignment(horizontal="right", vertical="center")),
        ("TER Anual (%)", Alignment(horizontal="right", vertical="center")),
        ("TIR / XIRR (%)", Alignment(horizontal="right", vertical="center")),
        ("Fecha Cotización", Alignment(horizontal="center", vertical="center")),
    ]

    header_row = 4
    ws.row_dimensions[header_row].height = 28
    for col_idx, (title, align) in enumerate(headers, start=1):
        cell = ws.cell(row=header_row, column=col_idx, value=title)
        cell.font = FONT_HEADER
        cell.fill = FILL_HEADER
        cell.alignment = align
        cell.border = BORDER_CELL

    # 3. Filas de datos
    data_start = 5
    curr_row = data_start
    for p in positions:
        p_dict = _to_dict(p)
        shares = float(p_dict.get("shares") or 0.0)
        avg_cost = float(p_dict.get("avg_cost") or 0.0)
        curr_price = float(p_dict.get("current_price") or avg_cost)
        invested = float(p_dict.get("invested_amount") or (shares * avg_cost))
        value = float(p_dict.get("current_value") or (shares * curr_price))
        pnl = float(p_dict.get("unrealized_pnl") if p_dict.get("unrealized_pnl") is not None else (value - invested))
        pnl_pct = (pnl / invested) if invested > 0 else 0.0
        daily_chg_pct = (float(p_dict.get("daily_change_pct")) / 100.0) if p_dict.get("daily_change_pct") is not None else None
        weight = (float(p_dict.get("weight")) / 100.0) if p_dict.get("weight") is not None else None
        ter = (float(p_dict.get("ter")) / 100.0) if p_dict.get("ter") is not None else None
        irr = (float(p_dict.get("irr")) / 100.0) if p_dict.get("irr") is not None else None
        price_date = p_dict.get("price_date") or p_dict.get("last_updated") or ""

        fill = FILL_ZEBRA if curr_row % 2 == 1 else None

        row_values = [
            (p_dict.get("name") or p_dict.get("isin"), "left", None, FONT_DATA),
            (p_dict.get("isin") or "", "center", None, FONT_DATA),
            (p_dict.get("ticker") or "—", "center", None, FONT_DATA),
            (_format_asset_type(p_dict.get("asset_type")), "left", None, FONT_DATA),
            (_format_broker_name(p_dict.get("broker")), "center", None, FONT_DATA),
            (shares, "right", FMT_SHARES, FONT_DATA),
            (avg_cost, "right", FMT_CURRENCY_4, FONT_DATA),
            (curr_price, "right", FMT_CURRENCY_4, FONT_DATA),
            (invested, "right", FMT_CURRENCY, FONT_DATA),
            (value, "right", FMT_CURRENCY, FONT_DATA),
            (pnl, "right", FMT_CURRENCY, FONT_GREEN if pnl >= 0 else FONT_RED),
            (pnl_pct, "right", FMT_PERCENT, FONT_GREEN if pnl_pct >= 0 else FONT_RED),
            (daily_chg_pct if daily_chg_pct is not None else "—", "right", FMT_PERCENT if daily_chg_pct is not None else None, FONT_GREEN if (daily_chg_pct or 0) >= 0 else FONT_RED),
            (weight if weight is not None else 0.0, "right", FMT_PERCENT_UNSIGNED, FONT_DATA),
            (ter if ter is not None else "—", "right", FMT_PERCENT_UNSIGNED if ter is not None else None, FONT_DATA),
            (irr if irr is not None else "—", "right", FMT_PERCENT, FONT_GREEN if (irr or 0) >= 0 else FONT_RED),
            (price_date, "center", None, FONT_DATA),
        ]

        ws.row_dimensions[curr_row].height = 20
        for col_idx, (val, halign, num_fmt, font) in enumerate(row_values, start=1):
            cell = ws.cell(row=curr_row, column=col_idx, value=val)
            cell.font = font
            cell.alignment = Alignment(horizontal=halign, vertical="center")
            cell.border = BORDER_CELL
            if fill:
                cell.fill = fill
            if num_fmt and isinstance(val, (int, float)):
                cell.number_format = num_fmt

        curr_row += 1

    # 4. Fila de TOTALES consolidada con fórmulas nativas de Excel
    tot_row = curr_row
    ws.row_dimensions[tot_row].height = 24

    ws.cell(row=tot_row, column=1, value="TOTALES CARTERA").font = FONT_TOTAL
    ws.cell(row=tot_row, column=1).alignment = Alignment(horizontal="left", vertical="center")

    for col in range(2, 9):
        ws.cell(row=tot_row, column=col, value="")

    # Invertido: Columna 9 (I)
    inv_formula = f"=SUM(I{data_start}:I{tot_row-1})" if tot_row > data_start else 0
    cell_inv = ws.cell(row=tot_row, column=9, value=inv_formula)
    cell_inv.number_format = FMT_CURRENCY
    cell_inv.font = FONT_TOTAL

    # Valor actual: Columna 10 (J)
    val_formula = f"=SUM(J{data_start}:J{tot_row-1})" if tot_row > data_start else 0
    cell_val = ws.cell(row=tot_row, column=10, value=val_formula)
    cell_val.number_format = FMT_CURRENCY
    cell_val.font = FONT_TOTAL

    # Plusvalía Total: Columna 11 (K) = J(tot) - I(tot)
    pnl_formula = f"=J{tot_row}-I{tot_row}"
    cell_pnl = ws.cell(row=tot_row, column=11, value=pnl_formula)
    cell_pnl.number_format = FMT_CURRENCY
    cell_pnl.font = FONT_TOTAL

    # Rentabilidad Total: Columna 12 (L) = K(tot) / I(tot)
    ret_formula = f"=IF(I{tot_row}>0, K{tot_row}/I{tot_row}, 0)"
    cell_ret = ws.cell(row=tot_row, column=12, value=ret_formula)
    cell_ret.number_format = FMT_PERCENT
    cell_ret.font = FONT_TOTAL

    # Col 13: Guion
    ws.cell(row=tot_row, column=13, value="—").alignment = Alignment(horizontal="right", vertical="center")

    # Peso Total: Columna 14 (N) = SUM(N...)
    weight_formula = f"=SUM(N{data_start}:N{tot_row-1})" if tot_row > data_start else 1.0
    cell_w = ws.cell(row=tot_row, column=14, value=weight_formula)
    cell_w.number_format = FMT_PERCENT_UNSIGNED
    cell_w.font = FONT_TOTAL

    # Resto de columnas
    ws.cell(row=tot_row, column=15, value="—")
    ws.cell(row=tot_row, column=16, value="—")
    ws.cell(row=tot_row, column=17, value="—")

    for col in range(1, 18):
        c = ws.cell(row=tot_row, column=col)
        c.fill = FILL_TOTAL
        c.border = BORDER_TOTAL
        if not c.alignment.horizontal:
            c.alignment = Alignment(horizontal="right", vertical="center")

    _autofit_columns(ws)


def create_performance_sheet(ws, perf_points: list[dict | Any], broker: Optional[str] = None, period: str = "all"):
    """Rellena una hoja con la serie temporal de rendimientos día a día."""
    ws.title = "Histórico Rendimiento"
    ws.views.sheetView[0].showGridLines = True

    # 1. Título y Metadatos
    ws["A1"] = "PORTFOLIOPRO — HISTÓRICO DE RENDIMIENTO DÍA A DÍA"
    ws["A1"].font = FONT_TITLE
    now_str = datetime.now().strftime("%d/%m/%Y %H:%M")
    b_name = _format_broker_name(broker)
    first_date = (perf_points[0].date if hasattr(perf_points[0], "date") else perf_points[0].get("date")) if perf_points else "—"
    last_date = (perf_points[-1].date if hasattr(perf_points[-1], "date") else perf_points[-1].get("date")) if perf_points else "—"
    ws["A2"] = f"Entidad: {b_name}   |   Periodo: {period.upper()} ({first_date} a {last_date})   |   Sesiones registradas: {len(perf_points)}   |   Generado: {now_str}"
    ws["A2"].font = FONT_SUBTITLE
    ws.row_dimensions[1].height = 24
    ws.row_dimensions[2].height = 18

    # 2. Descubrir si hay desglose por broker disponible
    sample_brokers = set()
    for pt in perf_points[:30]:
        b_dict = getattr(pt, "brokers", None) or (pt.get("brokers") if isinstance(pt, dict) else None)
        if isinstance(b_dict, dict):
            sample_brokers.update(b_dict.keys())
    has_broker_breakdown = len(sample_brokers) > 0 and (not broker or broker.lower() in ("all", "todos"))
    sorted_brokers = sorted(list(sample_brokers))

    headers = [
        ("Fecha", Alignment(horizontal="center", vertical="center")),
        ("Valor de Cartera (€)", Alignment(horizontal="right", vertical="center")),
        ("Capital Invertido (€)", Alignment(horizontal="right", vertical="center")),
        ("Plusvalía Acumulada (€)", Alignment(horizontal="right", vertical="center")),
        ("Rentabilidad Acumulada (%)", Alignment(horizontal="right", vertical="center")),
        ("Rendimiento Diario (%)", Alignment(horizontal="right", vertical="center")),
        ("Flujo Neto del Día (€)", Alignment(horizontal="right", vertical="center")),
    ]

    if has_broker_breakdown:
        for b in sorted_brokers:
            headers.append((f"Valor {b.capitalize()} (€)", Alignment(horizontal="right", vertical="center")))

    header_row = 4
    ws.row_dimensions[header_row].height = 28
    for col_idx, (title, align) in enumerate(headers, start=1):
        cell = ws.cell(row=header_row, column=col_idx, value=title)
        cell.font = FONT_HEADER
        cell.fill = FILL_HEADER
        cell.alignment = align
        cell.border = BORDER_CELL

    # 3. Datos
    curr_row = 5
    for pt in perf_points:
        pt_dict = _to_dict(pt)
        dt_str = pt_dict.get("date") or ""
        val = float(pt_dict.get("value") or 0.0)
        inv = float(pt_dict.get("invested") or 0.0)
        pnl = val - inv
        pnl_pct = (pnl / inv) if inv > 0 else 0.0
        daily_ret = float(pt_dict.get("daily_return") or 0.0)
        net_inflow = float(pt_dict.get("net_inflow") or 0.0)

        fill = FILL_ZEBRA if curr_row % 2 == 1 else None

        row_cells = [
            (dt_str, "center", None, FONT_DATA),
            (val, "right", FMT_CURRENCY, FONT_DATA),
            (inv, "right", FMT_CURRENCY, FONT_DATA),
            (pnl, "right", FMT_CURRENCY, FONT_GREEN if pnl >= 0 else FONT_RED),
            (pnl_pct, "right", FMT_PERCENT, FONT_GREEN if pnl_pct >= 0 else FONT_RED),
            (daily_ret, "right", FMT_PERCENT, FONT_GREEN if daily_ret >= 0 else FONT_RED),
            (net_inflow, "right", FMT_CURRENCY, FONT_DATA),
        ]

        if has_broker_breakdown:
            b_dict = pt_dict.get("brokers") or {}
            for b in sorted_brokers:
                b_info = b_dict.get(b) or {}
                b_val = float(b_info.get("value") or 0.0) if isinstance(b_info, dict) else float(b_info or 0.0)
                row_cells.append((b_val, "right", FMT_CURRENCY, FONT_DATA))

        ws.row_dimensions[curr_row].height = 19
        for col_idx, (c_val, halign, num_fmt, font) in enumerate(row_cells, start=1):
            cell = ws.cell(row=curr_row, column=col_idx, value=c_val)
            cell.font = font
            cell.alignment = Alignment(horizontal=halign, vertical="center")
            cell.border = BORDER_CELL
            if fill:
                cell.fill = fill
            if num_fmt and isinstance(c_val, (int, float)):
                cell.number_format = num_fmt

        curr_row += 1

    _autofit_columns(ws)


def create_transactions_sheet(ws, transactions: list[dict | Any], broker: Optional[str] = None):
    """Rellena una hoja con el historial detallado de operaciones."""
    ws.title = "Operaciones"
    ws.views.sheetView[0].showGridLines = True

    # 1. Título y Metadatos
    ws["A1"] = "PORTFOLIOPRO — REGISTRO HISTÓRICO DE OPERACIONES"
    ws["A1"].font = FONT_TITLE
    now_str = datetime.now().strftime("%d/%m/%Y %H:%M")
    b_name = _format_broker_name(broker)
    ws["A2"] = f"Entidad: {b_name}   |   Fecha de generación: {now_str}   |   Total operaciones: {len(transactions)}"
    ws["A2"].font = FONT_SUBTITLE
    ws.row_dimensions[1].height = 24
    ws.row_dimensions[2].height = 18

    # 2. Cabeceras
    headers = [
        ("Fecha", Alignment(horizontal="center", vertical="center")),
        ("Tipo de Operación", Alignment(horizontal="center", vertical="center")),
        ("Activo / Fondo", Alignment(horizontal="left", vertical="center")),
        ("ISIN", Alignment(horizontal="center", vertical="center")),
        ("Broker", Alignment(horizontal="center", vertical="center")),
        ("Títulos", Alignment(horizontal="right", vertical="center")),
        ("Precio Unitario (€)", Alignment(horizontal="right", vertical="center")),
        ("Importe Total (€)", Alignment(horizontal="right", vertical="center")),
        ("Comisiones (€)", Alignment(horizontal="right", vertical="center")),
        ("Notas / Descripción", Alignment(horizontal="left", vertical="center")),
    ]

    header_row = 4
    ws.row_dimensions[header_row].height = 28
    for col_idx, (title, align) in enumerate(headers, start=1):
        cell = ws.cell(row=header_row, column=col_idx, value=title)
        cell.font = FONT_HEADER
        cell.fill = FILL_HEADER
        cell.alignment = align
        cell.border = BORDER_CELL

    # 3. Filas de datos
    curr_row = 5
    for t in transactions:
        t_dict = _to_dict(t)
        t_type = (t_dict.get("type") or "buy").upper()
        type_labels = {
            "BUY": "COMPRA",
            "SELL": "VENTA",
            "DIVIDEND": "DIVIDENDO",
            "TRANSFER": "TRASPASO",
            "DEPOSIT": "DEPÓSITO",
            "WITHDRAWAL": "RETIRADA",
        }
        type_label = type_labels.get(t_type, t_type)

        shares = float(t_dict.get("shares") or 0.0)
        price = float(t_dict.get("price") or 0.0)
        amount = float(t_dict.get("amount") or 0.0)
        fees = float(t_dict.get("fees") or 0.0)
        notes = t_dict.get("notes") or ""

        fill = FILL_ZEBRA if curr_row % 2 == 1 else None

        font_type = FONT_GREEN if t_type in ("BUY", "DIVIDEND") else (FONT_RED if t_type == "SELL" else FONT_DATA)

        row_cells = [
            (t_dict.get("date") or "", "center", None, FONT_DATA),
            (type_label, "center", None, font_type),
            (t_dict.get("asset_name") or t_dict.get("name") or t_dict.get("isin") or "", "left", None, FONT_DATA),
            (t_dict.get("isin") or "", "center", None, FONT_DATA),
            (_format_broker_name(t_dict.get("broker")), "center", None, FONT_DATA),
            (shares if shares > 0 else "—", "right", FMT_SHARES if shares > 0 else None, FONT_DATA),
            (price if price > 0 else "—", "right", FMT_CURRENCY_4 if price > 0 else None, FONT_DATA),
            (amount, "right", FMT_CURRENCY, FONT_DATA),
            (fees if fees > 0 else 0.0, "right", FMT_CURRENCY, FONT_DATA),
            (notes, "left", None, FONT_DATA),
        ]

        ws.row_dimensions[curr_row].height = 20
        for col_idx, (c_val, halign, num_fmt, font) in enumerate(row_cells, start=1):
            cell = ws.cell(row=curr_row, column=col_idx, value=c_val)
            cell.font = font
            cell.alignment = Alignment(horizontal=halign, vertical="center")
            cell.border = BORDER_CELL
            if fill:
                cell.fill = fill
            if num_fmt and isinstance(c_val, (int, float)):
                cell.number_format = num_fmt

        curr_row += 1

    # Totales de operaciones
    tot_row = curr_row
    ws.row_dimensions[tot_row].height = 24
    ws.cell(row=tot_row, column=1, value="TOTAL EFECTIVO OPERADO").font = FONT_TOTAL
    for c in range(2, 8):
        ws.cell(row=tot_row, column=c, value="")

    cell_tot_amount = ws.cell(row=tot_row, column=8, value=f"=SUM(H5:H{tot_row-1})" if tot_row > 5 else 0)
    cell_tot_amount.number_format = FMT_CURRENCY
    cell_tot_amount.font = FONT_TOTAL

    cell_tot_fees = ws.cell(row=tot_row, column=9, value=f"=SUM(I5:I{tot_row-1})" if tot_row > 5 else 0)
    cell_tot_fees.number_format = FMT_CURRENCY
    cell_tot_fees.font = FONT_TOTAL

    ws.cell(row=tot_row, column=10, value="")

    for col in range(1, 11):
        cell = ws.cell(row=tot_row, column=col)
        cell.fill = FILL_TOTAL
        cell.border = BORDER_TOTAL

    _autofit_columns(ws)


def create_summary_sheet(ws, summary: dict | Any, positions: list[dict | Any], broker: Optional[str] = None):
    """Rellena la hoja de Resumen Ejecutivo con KPIs y distribución por entidad."""
    ws.title = "Resumen Cartera"
    ws.views.sheetView[0].showGridLines = True

    # Título
    ws["A1"] = "PORTFOLIOPRO — RESUMEN EJECUTIVO DE CARTERA"
    ws["A1"].font = FONT_TITLE
    now_str = datetime.now().strftime("%d/%m/%Y %H:%M")
    b_name = _format_broker_name(broker)
    ws["A2"] = f"Entidad: {b_name}   |   Fecha de corte: {now_str}   |   Moneda base: EUR (€)"
    ws["A2"].font = FONT_SUBTITLE
    ws.row_dimensions[1].height = 24
    ws.row_dimensions[2].height = 18

    # KPIs Principales
    s_dict = _to_dict(summary)
    total_val = float(s_dict.get("total_value") or 0.0)
    total_inv = float(s_dict.get("total_invested") or 0.0)
    total_pnl = float(s_dict.get("total_pnl") or (total_val - total_inv))
    total_pnl_pct = (total_pnl / total_inv) if total_inv > 0 else 0.0
    irr = float(s_dict.get("irr") or 0.0) / 100.0 if s_dict.get("irr") is not None else None

    # Bloque de KPIs
    kpis = [
        ("Patrimonio Total Valor Liquidativo", total_val, FMT_CURRENCY, FONT_DATA),
        ("Capital Invertido Acumulado", total_inv, FMT_CURRENCY, FONT_DATA),
        ("Plusvalía Latente Neta", total_pnl, FMT_CURRENCY, FONT_GREEN if total_pnl >= 0 else FONT_RED),
        ("Rentabilidad Simple Global (%)", total_pnl_pct, FMT_PERCENT, FONT_GREEN if total_pnl_pct >= 0 else FONT_RED),
    ]
    if irr is not None:
        kpis.append(("TIR Personalizada Anualizada (XIRR)", irr, FMT_PERCENT, FONT_GREEN if irr >= 0 else FONT_RED))
    kpis.append(("Número de Posiciones Activas", len(positions), FMT_INTEGER, FONT_DATA))

    ws.cell(row=4, column=1, value="MÉTRICAS CLAVE").font = FONT_HEADER
    ws.cell(row=4, column=1).fill = FILL_HEADER
    ws.cell(row=4, column=2, value="VALOR").font = FONT_HEADER
    ws.cell(row=4, column=2).fill = FILL_HEADER
    ws.cell(row=4, column=2).alignment = Alignment(horizontal="right", vertical="center")
    ws.row_dimensions[4].height = 26

    for idx, (label, val, num_fmt, font) in enumerate(kpis, start=5):
        ws.row_dimensions[idx].height = 21
        c1 = ws.cell(row=idx, column=1, value=label)
        c1.font = FONT_DATA
        c1.border = BORDER_CELL
        if idx % 2 == 1:
            c1.fill = FILL_ZEBRA

        c2 = ws.cell(row=idx, column=2, value=val)
        c2.font = font
        c2.border = BORDER_CELL
        c2.alignment = Alignment(horizontal="right", vertical="center")
        if num_fmt and isinstance(val, (int, float)):
            c2.number_format = num_fmt
        if idx % 2 == 1:
            c2.fill = FILL_ZEBRA

    # Distribución por Broker
    broker_totals: dict[str, dict[str, float]] = {}
    for p in positions:
        p_dict = _to_dict(p)
        b = _format_broker_name(p_dict.get("broker"))
        b_data = broker_totals.setdefault(b, {"value": 0.0, "invested": 0.0, "count": 0})
        b_data["value"] += float(p_dict.get("current_value") or 0.0)
        b_data["invested"] += float(p_dict.get("invested_amount") or 0.0)
        b_data["count"] += 1

    start_broker_row = len(kpis) + 7
    ws.cell(row=start_broker_row, column=1, value="DESGLOSE POR BROKER / ENTIDAD").font = FONT_HEADER
    ws.cell(row=start_broker_row, column=1).fill = FILL_HEADER
    ws.cell(row=start_broker_row, column=2, value="PATRIMONIO (€)").font = FONT_HEADER
    ws.cell(row=start_broker_row, column=2).fill = FILL_HEADER
    ws.cell(row=start_broker_row, column=2).alignment = Alignment(horizontal="right", vertical="center")
    ws.cell(row=start_broker_row, column=3, value="INVERTIDO (€)").font = FONT_HEADER
    ws.cell(row=start_broker_row, column=3).fill = FILL_HEADER
    ws.cell(row=start_broker_row, column=3).alignment = Alignment(horizontal="right", vertical="center")
    ws.cell(row=start_broker_row, column=4, value="PLUSVALÍA (€)").font = FONT_HEADER
    ws.cell(row=start_broker_row, column=4).fill = FILL_HEADER
    ws.cell(row=start_broker_row, column=4).alignment = Alignment(horizontal="right", vertical="center")
    ws.cell(row=start_broker_row, column=5, value="RENTABILIDAD (%)").font = FONT_HEADER
    ws.cell(row=start_broker_row, column=5).fill = FILL_HEADER
    ws.cell(row=start_broker_row, column=5).alignment = Alignment(horizontal="right", vertical="center")
    ws.cell(row=start_broker_row, column=6, value="PESO (%)").font = FONT_HEADER
    ws.cell(row=start_broker_row, column=6).fill = FILL_HEADER
    ws.cell(row=start_broker_row, column=6).alignment = Alignment(horizontal="right", vertical="center")
    ws.row_dimensions[start_broker_row].height = 26

    b_row = start_broker_row + 1
    for b_name_key, b_info in sorted(broker_totals.items(), key=lambda x: x[1]["value"], reverse=True):
        b_val = b_info["value"]
        b_inv = b_info["invested"]
        b_pnl = b_val - b_inv
        b_ret = (b_pnl / b_inv) if b_inv > 0 else 0.0
        b_weight = (b_val / total_val) if total_val > 0 else 0.0

        fill = FILL_ZEBRA if b_row % 2 == 1 else None
        ws.row_dimensions[b_row].height = 20

        cells = [
            (b_name_key, "left", None, FONT_DATA),
            (b_val, "right", FMT_CURRENCY, FONT_DATA),
            (b_inv, "right", FMT_CURRENCY, FONT_DATA),
            (b_pnl, "right", FMT_CURRENCY, FONT_GREEN if b_pnl >= 0 else FONT_RED),
            (b_ret, "right", FMT_PERCENT, FONT_GREEN if b_ret >= 0 else FONT_RED),
            (b_weight, "right", FMT_PERCENT_UNSIGNED, FONT_DATA),
        ]
        for col_idx, (c_val, halign, num_fmt, font) in enumerate(cells, start=1):
            cell = ws.cell(row=b_row, column=col_idx, value=c_val)
            cell.font = font
            cell.alignment = Alignment(horizontal=halign, vertical="center")
            cell.border = BORDER_CELL
            if fill:
                cell.fill = fill
            if num_fmt and isinstance(c_val, (int, float)):
                cell.number_format = num_fmt

        b_row += 1

    _autofit_columns(ws)


# ── Funciones de generación de Streams de bytes (.xlsx) ──────────────────────

def generate_positions_excel(positions: list[dict | Any], broker: Optional[str] = None) -> io.BytesIO:
    """Genera un archivo Excel (.xlsx) con la tabla de posiciones."""
    wb = openpyxl.Workbook()
    ws = wb.active
    create_positions_sheet(ws, positions, broker=broker)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def generate_performance_excel(perf_points: list[dict | Any], broker: Optional[str] = None, period: str = "all") -> io.BytesIO:
    """Genera un archivo Excel (.xlsx) con el histórico de rentabilidad día a día."""
    wb = openpyxl.Workbook()
    ws = wb.active
    create_performance_sheet(ws, perf_points, broker=broker, period=period)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def generate_transactions_excel(transactions: list[dict | Any], broker: Optional[str] = None) -> io.BytesIO:
    """Genera un archivo Excel (.xlsx) con el histórico de operaciones."""
    wb = openpyxl.Workbook()
    ws = wb.active
    create_transactions_sheet(ws, transactions, broker=broker)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def generate_full_portfolio_excel(
    summary: dict | Any,
    positions: list[dict | Any],
    perf_points: list[dict | Any],
    transactions: list[dict | Any],
    broker: Optional[str] = None,
    period: str = "all",
) -> io.BytesIO:
    """Genera un libro Excel multi-pestaña completo con todo el ecosistema de cartera."""
    wb = openpyxl.Workbook()

    # Pestaña 1: Resumen
    ws1 = wb.active
    create_summary_sheet(ws1, summary, positions, broker=broker)

    # Pestaña 2: Posiciones
    ws2 = wb.create_sheet(title="Posiciones")
    create_positions_sheet(ws2, positions, broker=broker)

    # Pestaña 3: Histórico Día a Día
    ws3 = wb.create_sheet(title="Histórico Rendimiento")
    create_performance_sheet(ws3, perf_points, broker=broker, period=period)

    # Pestaña 4: Operaciones
    ws4 = wb.create_sheet(title="Operaciones")
    create_transactions_sheet(ws4, transactions, broker=broker)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf
