import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stackbotglobal.app',
  appName: 'StackBot',
  webDir: 'out',
  server: {
    url: 'https://stackbotglobal.com',
    cleartext: true,
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: true,  // ← CHANGE THIS TO TRUE
      providers: ['apple.com', 'google.com'],
    },
  },
};

export default config;