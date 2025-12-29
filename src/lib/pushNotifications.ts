import { PushNotifications } from '@capacitor/push-notifications';

export async function initPushNotifications() {
  const permStatus = await PushNotifications.requestPermissions();

  if (permStatus.receive === 'granted') {
    await PushNotifications.register();
  }

  PushNotifications.addListener('registration', token => {
    console.log('Push token:', token.value);
    // Save token to Firestore here
  });

  PushNotifications.addListener('registrationError', err => {
    console.error('Push registration error:', err);
  });
}
