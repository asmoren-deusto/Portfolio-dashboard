import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.asier.portfoliodashboard',
  appName: 'PortfolioPro',
  webDir: 'dist',
  server: {
    url: 'https://portfolio.asiermoreno.es',
    cleartext: false,
    androidScheme: 'https',
    iosScheme: 'https',
    allowNavigation: ['portfolio.asiermoreno.es', '*.asiermoreno.es'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#181922',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#181922',
    },
  },
}

export default config
