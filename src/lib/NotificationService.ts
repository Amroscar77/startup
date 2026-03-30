import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { messaging, db } from './firebase';

export const NotificationService = {
  async requestPermission(userId: string) {
    if (!messaging) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: 'YOUR_VAPID_KEY' // This should be provided by the user from Firebase Console
        });
        
        if (token) {
          // Store token in user's profile
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(token)
          });
          return token;
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  },

  onMessageListener() {
    if (!messaging) return;
    
    return new Promise((resolve) => {
      onMessage(messaging, (payload) => {
        console.log('Message received: ', payload);
        resolve(payload);
      });
    });
  }
};
