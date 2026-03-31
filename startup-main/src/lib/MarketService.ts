import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  updateDoc, 
  doc, 
  increment,
  Timestamp,
  where,
  getDocs,
  startAt,
  endAt,
  setDoc,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from './firebase';
import { geohashForLocation, geohashQueryBounds, distanceBetween } from 'geofire-common';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface PriceSubmission {
  id?: string;
  itemName: string;
  price: number;
  currency: string;
  storeName: string;
  location: { lat: number; lng: number; address: string };
  geohash: string;
  userId: string;
  userName: string;
  userPhoto: string;
  timestamp: any;
  verified: boolean;
  confirmations: number;
  category: string;
  imageUrl?: string;
  isSponsored?: boolean;
}

export interface PriceHistory {
  itemId: string;
  price: number;
  timestamp: any;
  submissionId: string;
}

export interface UserStats {
  currentStreak: number;
  maxStreak: number;
  lastActiveDate: string;
  points: number;
}

export interface Shop {
  id: string;
  name: string;
  isFeatured: boolean;
  logoUrl?: string;
  category: string;
  location: { lat: number; lng: number; address: string };
}

export const MarketService = {
  generateItemId(itemName: string, storeName: string, lat: number, lng: number) {
    // Simple ID for item at specific location
    return `${itemName.toLowerCase().replace(/\s+/g, '_')}_${storeName.toLowerCase().replace(/\s+/g, '_')}_${lat.toFixed(4)}_${lng.toFixed(4)}`;
  },

  async submitPrice(submission: Omit<PriceSubmission, 'id' | 'timestamp' | 'confirmations' | 'verified' | 'geohash'>) {
    const hash = geohashForLocation([submission.location.lat, submission.location.lng]);
    const itemId = this.generateItemId(submission.itemName, submission.storeName, submission.location.lat, submission.location.lng);
    
    const batch = writeBatch(db);
    
    // 1. Create submission
    const submissionRef = doc(collection(db, 'submissions'));
    batch.set(submissionRef, {
      ...submission,
      geohash: hash,
      timestamp: Timestamp.now(),
      confirmations: 0,
      verified: false
    });
    
    // 2. Add to price history
    const historyRef = doc(collection(db, 'price_history'));
    batch.set(historyRef, {
      itemId,
      price: submission.price,
      timestamp: Timestamp.now(),
      submissionId: submissionRef.id
    });
    
    // 3. Update user stats & streak
    const userRef = doc(db, 'users', submission.userId);
    const userSnap = await getDoc(userRef);
    const today = new Date().toISOString().split('T')[0];
    
    let streakUpdate = {};
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const lastActive = userData.lastActiveDate;
      
      if (lastActive !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastActive === yesterdayStr) {
          streakUpdate = {
            currentStreak: increment(1),
            maxStreak: Math.max(userData.maxStreak || 0, (userData.currentStreak || 0) + 1),
            lastActiveDate: today
          };
        } else {
          streakUpdate = {
            currentStreak: 1,
            lastActiveDate: today
          };
        }
      }
    } else {
      streakUpdate = {
        currentStreak: 1,
        maxStreak: 1,
        lastActiveDate: today
      };
    }

    batch.update(userRef, {
      pricesAdded: increment(1),
      points: increment(10),
      ...streakUpdate
    });
    
    // 4. Update daily missions
    const missionRef = doc(db, `users/${submission.userId}/daily_stats`, today);
    const missionSnap = await getDoc(missionRef);
    let missionData = { pricesAdded: 0, pricesConfirmed: 0, completed: false };
    if (missionSnap.exists()) {
      missionData = missionSnap.data() as any;
    }

    const newPricesAdded = missionData.pricesAdded + 1;
    const isNowCompleted = !missionData.completed && newPricesAdded >= 2 && missionData.pricesConfirmed >= 3;

    batch.set(missionRef, {
      date: today,
      pricesAdded: newPricesAdded,
      pricesConfirmed: missionData.pricesConfirmed,
      completed: isNowCompleted || missionData.completed
    }, { merge: true });

    if (isNowCompleted) {
      batch.update(userRef, {
        points: increment(50) // Bonus for mission completion
      });
    }

    try {
      await batch.commit();
      return submissionRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `submissions/${submissionRef.id}`);
    }
  },

  async confirmPrice(submissionId: string, userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const batch = writeBatch(db);
    
    const docRef = doc(db, 'submissions', submissionId);
    batch.update(docRef, {
      confirmations: increment(1)
    });
    
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : { points: 0 };

    batch.update(userRef, {
      points: increment(2)
    });

    const missionRef = doc(db, `users/${userId}/daily_stats`, today);
    const missionSnap = await getDoc(missionRef);
    let missionData = { pricesAdded: 0, pricesConfirmed: 0, completed: false };
    if (missionSnap.exists()) {
      missionData = missionSnap.data() as any;
    }

    const newPricesConfirmed = missionData.pricesConfirmed + 1;
    const isNowCompleted = !missionData.completed && missionData.pricesAdded >= 2 && newPricesConfirmed >= 3;

    batch.set(missionRef, {
      date: today,
      pricesAdded: missionData.pricesAdded,
      pricesConfirmed: newPricesConfirmed,
      completed: isNowCompleted || missionData.completed
    }, { merge: true });

    if (isNowCompleted) {
      batch.update(userRef, {
        points: increment(50) // Bonus for mission completion
      });
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `submissions/${submissionId}`);
    }
  },

  getRecentSubmissions(callback: (submissions: PriceSubmission[]) => void, lastDoc?: any) {
    let q = query(collection(db, 'submissions'), orderBy('timestamp', 'desc'), limit(20));
    if (lastDoc) {
      q = query(collection(db, 'submissions'), orderBy('timestamp', 'desc'), startAt(lastDoc), limit(20));
    }
    return onSnapshot(q, (snapshot) => {
      const submissions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PriceSubmission[];
      callback(submissions);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'submissions');
    });
  },

  async getDailyMissions(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const path = `users/${userId}/daily_stats/${today}`;
    const missionRef = doc(db, `users/${userId}/daily_stats`, today);
    
    try {
      const snap = await getDoc(missionRef);
      
      if (snap.exists()) {
        return snap.data();
      }
      
      return {
        date: today,
        pricesAdded: 0,
        pricesConfirmed: 0,
        completed: false
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async getPriceHistory(itemId: string, days: number = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const q = query(
      collection(db, 'price_history'),
      where('itemId', '==', itemId),
      where('timestamp', '>=', Timestamp.fromDate(cutoff)),
      orderBy('timestamp', 'asc')
    );
    
    try {
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.data() as PriceHistory);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'price_history');
    }
  },

  calculateTrend(history: PriceHistory[]) {
    if (history.length < 2) return 'Stable';
    
    const recent = history[history.length - 1].price;
    const previous = history[history.length - 2].price;
    
    if (recent > previous * 1.05) return 'Rising';
    if (recent < previous * 0.95) return 'Dropping';
    return 'Stable';
  },

  getSmartInsight(history: PriceHistory[]) {
    if (history.length < 3) return 'Buy now';
    
    const prices = history.map(h => h.price);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const current = prices[prices.length - 1];
    
    if (current < avg * 0.9) return 'Great deal! Buy now';
    if (current > avg * 1.1) return 'Price is high. Wait if possible';
    return 'Fair price. Buy now';
  },

  async uploadImage(file: File, onProgress?: (progress: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, `submissions/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.(progress);
        }, 
        (error) => {
          reject(error);
        }, 
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            resolve(downloadURL);
          });
        }
      );
    });
  },

  async getFeaturedShops() {
    const q = query(
      collection(db, 'shops'),
      where('isFeatured', '==', true),
      limit(5)
    );
    
    try {
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'shops');
    }
  },

  async getNearbySubmissions(center: [number, number], radiusInM: number) {
    const bounds = geohashQueryBounds(center, radiusInM);
    const promises = [];
    for (const b of bounds) {
      const q = query(
        collection(db, 'submissions'),
        orderBy('geohash'),
        startAt(b[0]),
        endAt(b[1])
      );
      promises.push(getDocs(q));
    }

    try {
      const snapshots = await Promise.all(promises);
      const matchingDocs: PriceSubmission[] = [];

      for (const snap of snapshots) {
        for (const doc of snap.docs) {
          const lat = doc.get('location.lat');
          const lng = doc.get('location.lng');

          // We have to filter out false positives due to GeoHash accuracy
          const distanceInKm = distanceBetween([lat, lng], center);
          const distanceInM = distanceInKm * 1000;
          if (distanceInM <= radiusInM) {
            matchingDocs.push({ id: doc.id, ...doc.data() } as PriceSubmission);
          }
        }
      }

      return matchingDocs;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'submissions');
    }
  }
};
