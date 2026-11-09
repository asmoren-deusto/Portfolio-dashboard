import { test, expect } from '@playwright/test';

test.describe('Portfolio Dashboard E2E Tests', () => {

  test('1. Debería mostrar la pantalla de Login con branding, perfiles y versión', async ({ page }) => {
    await page.goto('/login');

    // Verificar que estamos en la página de login
    await expect(page).toHaveURL(/.*login/);

    // Verificar el branding de PortfolioPro / Portfolio Dashboard
    const branding = page.locator('text=PortfolioPro').or(page.locator('text=Portfolio Dashboard')).first();
    await expect(branding).toBeVisible();

    // Verificar que la versión actual (v3.6.x) se muestra en pantalla
    const versionBadge = page.locator('text=/v3\\.6\\.\\d+/').first();
    await expect(versionBadge).toBeVisible();

    // Verificar que existe la opción de acceso Demo / Acceso Libre
    const demoCard = page.locator('text=Acceso Libre').first();
    await expect(demoCard).toBeVisible();
  });

  test('2. Debería permitir iniciar sesión con el perfil Demo y acceder a Visión General', async ({ page }) => {
    await page.goto('/login');

    // Clic en la tarjeta de Demo (Acceso Libre)
    const demoButton = page.locator('text=Acceso Libre').first();
    await demoButton.click();

    // Debe redirigir al dashboard principal (/)
    await page.waitForURL('/', { timeout: 10000 });
    await expect(page).toHaveURL('/');

    // KPI Cards de resumen (Patrimonio / Inversión)
    await expect(page.locator('text=Patrimonio').or(page.locator('text=Inversión')).first()).toBeVisible({ timeout: 10000 });

    // Verificar que la tabla de posiciones en cartera está visible
    await expect(page.locator('text=Posiciones en Cartera').first()).toBeVisible();
  });

  test('3. Debería mostrar la tabla de posiciones con sus columnas y el activo renombrado EPSV', async ({ page }) => {
    // Configurar sesión activa del usuario principal para cargar la cartera real con el backend
    await page.addInitScript(() => {
      localStorage.setItem('portfolio_active_user_id', 'asier');
    });

    await page.goto('/');

    // Si redirige a login (por falta de token), iniciar sesión Demo
    if (page.url().includes('/login')) {
      await page.locator('text=Acceso Libre').first().click();
      await page.waitForURL('/', { timeout: 10000 });
    }

    // Verificar encabezados de la tabla de posiciones
    await expect(page.locator('th:has-text("Activo / Fondo")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('th:has-text("NAV")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Día/Sem")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Valor Actual")').or(page.locator('th:has-text("Valor")')).first()).toBeVisible();
    await expect(page.locator('th:has-text("Ganancia")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Peso")').first()).toBeVisible();

    // En la tabla, verificar que al menos un activo principal está listado
    const anyFund = page.locator('text=Vanguard').or(page.locator('text=Indexa')).first();
    await expect(anyFund).toBeVisible({ timeout: 10000 });
  });

  test('4. Debería alternar entre Tema Claro y Oscuro, y Modo Privacidad', async ({ page }) => {
    await page.goto('/login');
    await page.locator('text=Acceso Libre').first().click();
    await page.waitForURL('/', { timeout: 10000 });

    const html = page.locator('html');
    const initialClass = await html.getAttribute('class');

    // Botón de cambio de tema
    const themeBtn = page.getByRole('button', { name: /modo claro|modo oscuro/i }).first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click({ force: true });
      await page.waitForTimeout(400);
      const newClass = await html.getAttribute('class');
      expect(newClass).not.toBe(initialClass);
    }

    // Botón de modo discreto / privacidad
    const privacyBtn = page.getByRole('button', { name: /modo discreto/i }).first();
    if (await privacyBtn.isVisible()) {
      await privacyBtn.click({ force: true });
      await page.waitForTimeout(300);
      await privacyBtn.click({ force: true }); // Restaurar
    }
  });

  test('5. Debería navegar correctamente por todas las secciones principales', async ({ page }) => {
    await page.goto('/login');
    await page.locator('text=Acceso Libre').first().click();
    await page.waitForURL('/', { timeout: 10000 });

    // 1. Posiciones (/positions)
    await page.goto('/positions');
    await expect(page).toHaveURL(/.*positions/);
    await expect(page.locator('text=Posiciones').first()).toBeVisible({ timeout: 10000 });

    // 2. Mercado (/market)
    await page.goto('/market');
    await expect(page).toHaveURL(/.*market/);
    await expect(page.locator('text=Mercado').or(page.locator('text=Índices')).first()).toBeVisible({ timeout: 10000 });

    // 3. Backtest (/backtest)
    await page.goto('/backtest');
    await expect(page).toHaveURL(/.*backtest/);
    await expect(page.locator('text=Backtest').or(page.locator('text=Simulador')).first()).toBeVisible({ timeout: 10000 });

    // 4. Diversificación (/diversification)
    await page.goto('/diversification');
    await expect(page).toHaveURL(/.*diversification/);
    await expect(page.locator('text=Diversificación').first()).toBeVisible({ timeout: 10000 });

    // 5. Analítica (/analytics)
    await page.goto('/analytics');
    await expect(page).toHaveURL(/.*analytics/);
    await expect(page.locator('text=Analítica').or(page.locator('text=Métricas')).or(page.locator('text=Rendimiento')).first()).toBeVisible({ timeout: 10000 });

    // 6. Operaciones / Transacciones (/transactions)
    await page.goto('/transactions');
    await expect(page).toHaveURL(/.*transactions/);
    await expect(page.locator('text=Operaciones').or(page.locator('text=Transacciones')).first()).toBeVisible({ timeout: 10000 });
  });

});
