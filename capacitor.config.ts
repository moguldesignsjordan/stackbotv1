import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stackbotglobal.app',
  appName: 'StackBot',

  server: {
    url: 'https://stackbotglobal.com', // ✅ LIVE SITE
    cleartext: false,
  },

  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false, // ✅ REQUIRED FOR GOOGLE PLAY
      providers: ['google.com', 'apple.com'],
    },
  },
};

export default config;
