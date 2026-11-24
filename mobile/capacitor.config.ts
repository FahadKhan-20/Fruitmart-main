import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.mdfresh.app',
  appName: 'MD Fresh',
  webDir: 'dist',
  backgroundColor: '#FFFFFF',
  plugins: {
    SplashScreen: { launchAutoHide: false, launchFadeOutDuration: 0, backgroundColor: '#FFFFFF', showSpinner: false },
    SystemBars: { insetsHandling: 'css' },
  },
};

export default config;
