import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.appmanutencao.twa',
  appName: 'App Manutenção',
  webDir: 'dist/public',
  server: {
    /**
     * O app é uma casca do site: o conteúdo vem daqui, ao vivo.
     *
     * Por isso o endereço tem de ser o domínio definitivo, e não o de uma
     * hospedagem passageira — apontava para uma URL do Cloud Run que saiu do
     * ar, e cada publicação do site deixava de chegar ao celular. Enquanto
     * este endereço não mudar, o app acompanha o deploy sem AAB novo; trocá-lo
     * obriga a gerar e subir outro pacote na Play.
     */
    url: 'https://appmanutencao.com.br',
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#f97316',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#f97316',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Desabilitar debug em produção
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scrollEnabled: true,
  },
};

export default config;
