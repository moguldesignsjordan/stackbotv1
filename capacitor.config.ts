import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stackbotglobal.app',
  appName: 'StackBot',
  webDir: 'out',
  server: {
    url: 'https://stackbotglobal.com',
    cleartext: true
  }
};

export default config;
