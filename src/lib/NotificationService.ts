import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { messaging, db } from './firebase';

// VAPID key must be set from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
const VAPID_KEY = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY || '';

export const NotificationService = {
  async requestPermission(userId: string) {
    if (!messaging) return null;
    if (!VAPID_KEY) {
      console.warn('VITE_FIREBASE_VAPID_KEY not set — push notifications disabled');
      return null;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return null;

      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (token) {
        await updateDoc(doc(db, 'users', userId), { fcmTokens: arrayUnion(token) });
        return token;
      }
      return null;
    } catch (error) {
      console.error('Notification permission error:', error);
      return null;
    }
  },

  onMessageListener() {
    if (!messaging) return Promise.resolve(null);
    return new Promise((resolve) => {
      onMessage(messaging, (payload) => resolve(payload));
    });
  },
};
