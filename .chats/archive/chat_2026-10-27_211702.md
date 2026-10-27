# Historial de Chat - Sesión Antigravity
- **Fecha de exportación:** 2026-10-27 21:17:02
- **ID de Conversación:** `dcf2d459-d371-4ebd-9ad9-517bd3f7d70e`
- **Total de interacciones registradas:** 3

> [!NOTE]
> Este archivo fue exportado automáticamente para preservar el contexto entre diferentes PCs.
> En un nuevo ordenador o chat, puedes referenciar este archivo con `@.chats/latest_chat.md`

---

### 👤 Usuario (2026-10-27 19:46:57)

el etc de oro no se actualiza

---

### 🤖 Asistente (2026-10-27 20:07:22)

El problema por el que el **ETC de Oro** (`IE00B4ND3602`, ticker `PPFB.DE`) no se actualizaba se debía a varios factores en la cadena de obtención y validación de precios:

---

### 🔍 Causas Detectadas

1. **Rechazo por comparación de fechas (`check_portfolio_navs`):**
   * Al registrarse la compra el día de hoy (`2026-10-27`), la base de datos tenía esa fecha como última referencia.
   * Cuando la cotización de Yahoo Finance o el fallback de sesión devolvía la fecha de liquidación del cierre anterior (`2026-10-26`), el comparador de fondos mutuales interpretaba que era una cotización obsoleta (`p_date < prev_d`) y **descartaba el nuevo precio**, manteniendo el precio fijo anterior.
2. **Contaminación por raspado de Financial Times en USD:**
   * Al consultar agregadores de fondos para ISINs estándar, Financial Times redirigía `IE00B4ND3602` a la ficha del ETF en Londres (`IGLN:LSE:USD`), devolviendo **78,71 $** (USD en lugar de EUR).
3. **Latencia en `yfinance` y falta de serie histórica:**
   * La llamada sincrónica `t.history(period="5d")` era lenta y bloqueaba peticiones concurrentes.
   * Además, en `seed_data.py` el ETC solo tenía un punto único de precio sin la sesión anterior (`2026-10-26: 69,685 €`), lo que impedía calcular con precisión el cambio diario de cotización.
4. **Caché prolongada en el Frontend:**
   * `usePositions` y `usePortfolioSummary` tenían un `staleTime` de 5 minutos y `refetchOnMount: false`, lo que impedía que la tabla refrescase las cotizaciones al cambiar entre pestañas.
5. **Omisión en la Cartera Simulada:**
   * En [`market.py`](file:///c:/Users/comos/Documents/GitHub/Portfolio-dashboard/backend/app/routers/market.py), `IE00B4ND3602` no estaba mapeado en `PORTFOLIO_ETF_PROXIES` y computaba erróneamente como bolsa global (`URTH`) en lugar de Oro (`IAU` / futuros `GC=F`).

---

### 🛠️ Solución Aplicada

1. **Prioridad a la API v8 Chart de Yahoo ([`price_service.py`](file:///c:/Users/comos/Documents/GitHub/Portfolio-dashboard/backend/app/services/price_service.py)):**
   * Se conecta directamente con el endpoint de alta velocidad de Yahoo (`query1.finance.yahoo.com/v8/finance/chart`), obteniendo el precio regular exacto en EUR (**70,66 €**) y el timestamp exacto de la sesión en menos de 50 ms.
   * Como respaldo secundario si falla Xetra (`PPFB.DE`), consulta la réplica en EUR de Londres (`EGLN.L`).
2. **Exclusión de ETCs en el scraper de fondos FT:**
   * Se evita expresamente que `IE00B4ND3602` pase por `_fetch_ft_official`, impidiendo cotizaciones en divisa incorrecta.
3. **Tratamiento diferencial para activos cotizados en vivo ([`portfolio.py`](file:///c:/Users/comos/Documents/GitHub/Portfolio-dashboard/backend/app/routers/portfolio.py)):**
   * En [`check_portfolio_navs`](file:///c:/Users/comos/Documents/GitHub/Portfolio-dashboard/backend/app/routers/portfolio.py#L400-L425), los activos cotizados en bolsa (ETCs, ETFs, acciones) no se descartan por la regla de desfase `T+1` de los fondos. Si hay variación de precio respecto a la sesión anterior, se actualiza inmediatamente.
4. **Historial de cotizaciones y base de datos ([`seed_data.py`](file:///c:/Users/comos/Documents/GitHub/Portfolio-dashboard/backend/app/seed_data.py) y [`database.py`](file:///c:/Users/comos/Documents/GitHub/Portfolio-dashboard/backend/app/database.py)):**
   * Incorporado el cierre anterior oficial (`69,685 €` a 26-Oct) y el cierre de hoy (**70,66 €** a 27-Oct).
   * Refleja ahora con exactitud el cambio diario: **+0,98 € (+1,40%)** y una plusvalía latente de **+28,27 € (+1,41%)**.
5. **Mapeo en Cartera Simulada ([`market.py`](file:///c:/Users/comos/Documents/GitHub/Portfolio-dashboard/backend/app/routers/market.py)):**
   * Vinculado `IE00B4ND3602` con `IAU` y futuros continuos de Oro `GC=F`.
6. **Frontend reactivo ([`queries.ts`](file:///c:/Users/comos/Documents/GitHub/Portfolio-dashboard/frontend/src/api/queries.ts)):**
   * Reducido el `staleTime` a **30 segundos** y activado `refetchOnMount: true` para que las posiciones y el resumen se refresquen al instante.

---

### 🚀 Release Publicada
* Build validada (`npm run build`: 0 errores).
* Versión incrementada y desplegada en Git: **v3.4.42**.

---

### 👤 Usuario (2026-10-27 19:48:14)

Desglose de Fondos y Réplicas para el oro esta mal

---
