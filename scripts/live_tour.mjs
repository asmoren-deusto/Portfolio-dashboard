import { chromium } from '@playwright/test';

async function main() {
  console.log('🚀 Iniciando navegador visible (Headed Mode) con Playwright...');
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000, // Pausa de 1 segundo entre acciones para que sea visible como un humano
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null, // Ocupar toda la pantalla maximizada
  });

  const page = await context.newPage();

  console.log('🌐 Navegando a http://localhost:5173...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1500);

  // Si estamos en la pantalla de login, entrar con Demo
  if (page.url().includes('login')) {
    console.log('🔑 Detectada pantalla de Login. Seleccionando perfil Demo (Acceso Libre)...');
    const demoBtn = page.locator('text=Acceso Libre').first();
    await demoBtn.highlight();
    await page.waitForTimeout(1000);
    await demoBtn.click();
    await page.waitForURL('http://localhost:5173/', { timeout: 10000 });
  }

  console.log('📊 En Visión General: explorando métricas y posiciones...');
  await page.waitForTimeout(2000);

  // Scroll suave hacia la tabla de posiciones
  const table = page.locator('text=Posiciones en Cartera').first();
  if (await table.isVisible()) {
    console.log('📜 Desplazando hacia la tabla de Posiciones en Cartera...');
    await table.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);

    // Pasar el ratón por los fondos para ver efectos hover
    const rows = page.locator('tbody tr');
    const count = Math.min(await rows.count(), 4);
    for (let i = 0; i < count; i++) {
      console.log(`👆 Pasando cursor por la fila ${i + 1}...`);
      await rows.nth(i).hover();
      await page.waitForTimeout(800);
    }
  }

  // Probar botón de tema
  console.log('🌓 Alternando tema Claro / Oscuro...');
  const themeBtn = page.getByRole('button', { name: /modo claro|modo oscuro/i }).first();
  if (await themeBtn.isVisible()) {
    await themeBtn.highlight();
    await page.waitForTimeout(800);
    await themeBtn.click();
    await page.waitForTimeout(2000);
    // Restaurar tema
    await themeBtn.click();
    await page.waitForTimeout(1000);
  }

  // Probar modo discreto / privacidad
  console.log('👁️ Probando Modo Privacidad (ocultar saldos)...');
  const privacyBtn = page.getByRole('button', { name: /modo discreto/i }).first();
  if (await privacyBtn.isVisible()) {
    await privacyBtn.highlight();
    await page.waitForTimeout(800);
    await privacyBtn.click();
    await page.waitForTimeout(2000);
    await privacyBtn.click(); // Restaurar
    await page.waitForTimeout(1000);
  }

  // Recorrido por las pestañas
  const tabs = [
    { name: 'Posiciones', url: '/positions' },
    { name: 'Mercado', url: '/market' },
    { name: 'Diversificación', url: '/diversification' },
    { name: 'Analítica', url: '/analytics' },
  ];

  for (const tab of tabs) {
    console.log(`🧭 Navegando a ${tab.name} (${tab.url})...`);
    await page.goto(`http://localhost:5173${tab.url}`);
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.scrollBy({ top: 350, behavior: 'smooth' }));
    await page.waitForTimeout(1500);
  }

  // Volver a la Visión General
  console.log('🏠 Volviendo a Visión General...');
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(2000);

  console.log('✅ Recorrido visual completado. El navegador permanecerá abierto para que lo inspecciones.');
  console.log('💡 Cuando quieras cerrarlo, puedes indicármelo o cerrar la ventana directamente.');

  // Mantener el navegador abierto esperando que el usuario lo revise (ej. 2 minutos o hasta que se cierre)
  await page.waitForTimeout(120000);
  await browser.close();
}

main().catch((err) => {
  console.error('❌ Error en el tour visual:', err);
});

