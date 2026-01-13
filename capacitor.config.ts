import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stackbotglobal.app',
  appName: 'StackBot',
  webDir: 'out',
  
  // Production: Load from your deployed web app
  server: {
    url: 'https://stackbotglobal.com',
    cleartext: true,
  },
  
  // iOS-specific configuration
  ios: {
    scheme: 'StackBot',
    contentInset: 'automatic',
  },
  
  // Android-specific configuration  
  android: {
    allowMixedContent: true,
  },
  
  // Plugins configuration
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['apple.com', 'google.com'],
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;