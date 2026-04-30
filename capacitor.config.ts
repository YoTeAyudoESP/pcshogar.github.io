import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pcshogar.app',
  appName: 'PCSHogar',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
