import { PushNotifications } from '@capacitor/push-notifications';
import { db, auth } from './firebase/config'; 
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function initPushNotifications() {
  // 1. Create Notification Channel (REQUIRED for Android Sound)
  await PushNotifications.createChannel({
    id: 'default', 
    name: 'General Notifications',
    description: 'General notifications for StackBot',
    importance: 5, // 5 = High (Heads-up display + Sound)
    sound: 'default',
    visibility: 1,
    vibration: true,
  });

  // 2. Request Permissions
  const permStatus = await PushNotifications.requestPermissions();

  if (permStatus.receive === 'granted') {
    await PushNotifications.register();
  }

  // 3. Save the token to Firestore when the phone registers
  PushNotifications.addListener('registration', async (token) => {
    console.log('Push token:', token.value);
    
    const user = auth.currentUser;
    if (user) {
      // Save to 'pushTokens' collection using the User ID as the document ID
      await setDoc(doc(db, 'pushTokens', user.uid), {
        token: token.value,
        platform: 'mobile',
        updatedAt: serverTimestamp(),
      });
    }
  });

  PushNotifications.addListener('registrationError', err => {
    console.error('Push registration error:', err);
  });
}