import type { CapacitorConfig } from '@capacitor/cli';

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
      skipNativeAuth: false,  
      providers: ['google.com', 'apple.com'],
    },
    FirebaseMessaging: {
      // Present notifications when app is in foreground
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '443911086980-3kcmk2kenug5evq8fe9td6r603ctp3g2.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;