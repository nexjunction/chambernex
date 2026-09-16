import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chambernex.live',
  appName: 'ChamberNex',
  webDir: 'public',
  server: {
    url: 'http://10.0.2.2:3000',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0b132b',
      showSpinner: true,
      spinnerColor: '#38bdf8'
    }
  }
};

export default config;