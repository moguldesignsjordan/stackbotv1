import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stackbotglobal.app',
  appName: 'StackBot',

  server: {
    url: 'https://stackbotglobal.com',
    cleartext: false,
  },

  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,  
      providers: ['google.com', 'apple.com'],
    },
  },
};

export default config;