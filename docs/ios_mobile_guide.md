# Guía de Compilación e Instalación iOS en la Nube (Sin Mac)

Esta guía explica cómo compilar y disponer de **PortfolioPro** en tu iPhone sin necesidad de tener un ordenador Mac local.

---

## ⚡ Opción 1: Acceso Inmediato como PWA (Recomendada, 0 descargas, 0 cables)

Tu aplicación ya está configurada con soporte PWA nativo (manifest, iconos Retina, Safe Area para el notch e isla dinámica, y barra de navegación inferior móvil).

1. Abre **Safari** en tu iPhone y entra en la URL de tu app (ej. `https://tu-dominio.com` o tu IP local en la misma red Wi-Fi).
2. Toca el botón **Compartir** (icono de cuadrado con flecha hacia arriba en la barra inferior de Safari).
3. Selecciona **"Añadir a la pantalla de inicio"** (Add to Home Screen).
4. Pulsa **Añadir**.

> 💡 **Resultado**: Se crea un icono nativo en tu pantalla de inicio. Al abrirlo, se ejecuta en pantalla completa (sin barras de navegador de Safari), con haptics y rendimiento idéntico a una app nativa.

---

## 📦 Opción 2: Compilar el `.ipa` en la Nube con GitHub Actions

Dispones de un flujo de CI/CD automatizado en `.github/workflows/build-ios.yml` que utiliza los servidores **macOS de Apple Silicon (M1/M2)** de GitHub con **Xcode preinstalado**.

### Paso 1: Ejecutar la compilación
1. Ve a tu repositorio en GitHub: `https://github.com/asmoren-deusto/Portfolio-dashboard/actions`.
2. En la lista izquierda de flujos de trabajo, haz clic en **"Build iOS App (IPA)"**.
3. Pulsa el botón **"Run workflow"** -> Selecciona rama `main` y target `device` -> Clic en **Run workflow**.
4. El runner de GitHub compilará el frontend Vite, sincronizará Capacitor y empaquetará el binario de Xcode en unos minutos.

### Paso 2: Descargar el archivo `.ipa`
1. Cuando termine la ejecución (icono verde ✅), entra en ella.
2. Abajo en la sección **Artifacts**, haz clic en **`PortfolioPro-iOS-Device-IPA`** para descargar el archivo `.zip`.
3. Descomprímelo en tu PC Windows para obtener `PortfolioPro.ipa`.

---

## 📲 Opción 3: Instalar el `.ipa` en tu iPhone desde Windows (Gratis con tu Apple ID)

Para instalar el archivo `.ipa` en tu iPhone físico desde un ordenador con Windows:

### Método A: Sideloadly (Recomendado para Windows)
1. Descarga e instala **[Sideloadly](https://sideloadly.io/)** en tu PC Windows (asegúrate de tener instalado iTunes oficial para Windows).
2. Conecta tu iPhone al PC por cable USB (o activa Wi-Fi Sync).
3. Abre Sideloadly:
   - Arrastra el archivo `PortfolioPro.ipa` a la ventana de Sideloadly.
   - Introduce tu dirección de correo de **Apple ID** (la cuenta normal gratuita de Apple).
   - Pulsa **Start**.
4. Una vez completado, verás el icono de **PortfolioPro** en tu iPhone.
5. **Primera apertura en iOS:**
   - Ve a **Ajustes** -> **General** -> **Gestión de dispositivos y VPN** en tu iPhone.
   - Selecciona tu Apple ID y pulsa en **"Confiar en esta app"**.
   - ¡Listo! La app se ejecutará de forma 100% nativa.

### Método B: AltStore
Si ya utilizas AltServer en Windows, puedes enviar el `.ipa` directamente a tu iPhone por Wi-Fi o cable.

---

## 🚀 Opción 4: TestFlight / App Store (Para distribución oficial)
Si en el futuro dispones de una cuenta de **Apple Developer Program** ($99/año):
- Puedes configurar tus claves de App Store Connect API en los Secrets de GitHub (`APP_STORE_KEY_ID`, `APP_STORE_ISSUER_ID`, `APP_STORE_PRIVATE_KEY`).
- El workflow de GitHub Actions puede firmar el binario y subirlo directamente a **TestFlight**, permitiéndote a ti y a otros usuarios instalarlo directamente desde la app TestFlight de Apple sin cables ni renovaciones periódicas.
