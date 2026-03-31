import {
  collection, addDoc, query, orderBy, limit, onSnapshot,
  updateDoc, doc, increment, Timestamp, where, getDocs,
  startAt, endAt, setDoc, getDoc, writeBatch, arrayUnion
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from './firebase';
import { geohashForLocation, geohashQueryBounds, distanceBetween } from 'geofire-common';

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
  confirmedBy?: string[];
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
    return `${itemName.toLowerCase().replace(/\s+/g, '_')}_${storeName.toLowerCase().replace(/\s+/g, '_')}_${lat.toFixed(4)}_${lng.toFixed(4)}`;
  },

  async submitPrice(submission: Omit<PriceSubmission, 'id' | 'timestamp' | 'confirmations' | 'verified' | 'geohash'>) {
    const hash = geohashForLocation([submission.location.lat, submission.location.lng]);
    const itemId = this.generateItemId(submission.itemName, submission.storeName, submission.location.lat, submission.location.lng);
    const batch = writeBatch(db);

    const submissionRef = doc(collection(db, 'submissions'));
    batch.set(submissionRef, {
      ...submission,
      geohash: hash,
      timestamp: Timestamp.now(),
      confirmations: 0,
      confirmedBy: [],
      verified: false,
    });

    const historyRef = doc(collection(db, 'price_history'));
    batch.set(historyRef, {
      itemId,
      price: submission.price,
      timestamp: Timestamp.now(),
      submissionId: submissionRef.id,
    });

    const userRef = doc(db, 'users', submission.userId);
    const userSnap = await getDoc(userRef);
    const today = new Date().toISOString().split('T')[0];

    let streakUpdate: any = {};
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const lastActive = userData.lastActiveDate;
      if (lastActive !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const currentStreak = userData.currentStreak || 0;
        const maxStreak = userData.maxStreak || 0;

        if (lastActive === yesterdayStr) {
          const newStreak = currentStreak + 1;
          streakUpdate = {
            currentStreak: newStreak,
            maxStreak: newStreak > maxStreak ? newStreak : maxStreak,
            lastActiveDate: today,
          };
        } else {
          streakUpdate = { currentStreak: 1, maxStreak: maxStreak < 1 ? 1 : maxStreak, lastActiveDate: today };
        }
      }
    } else {
      streakUpdate = { currentStreak: 1, maxStreak: 1, lastActiveDate: today };
    }

    batch.update(userRef, { pricesAdded: increment(1), points: increment(10), ...streakUpdate });

    const missionRef = doc(db, `users/${submission.userId}/daily_stats`, today);
    const missionSnap = await getDoc(missionRef);
    let missionData = { pricesAdded: 0, pricesConfirmed: 0, completed: false };
    if (missionSnap.exists()) missionData = missionSnap.data() as any;

    const newPricesAdded = missionData.pricesAdded + 1;
    const isNowCompleted = !missionData.completed && newPricesAdded >= 2 && missionData.pricesConfirmed >= 3;

    batch.set(missionRef, {
      date: today,
      pricesAdded: newPricesAdded,
      pricesConfirmed: missionData.pricesConfirmed,
      completed: isNowCompleted || missionData.completed,
    }, { merge: true });

    if (isNowCompleted) batch.update(userRef, { points: increment(50) });

    await batch.commit();
    return submissionRef.id;
  },

  async confirmPrice(submissionId: string, userId: string) {
    const docRef = doc(db, 'submissions', submissionId);
    const submissionSnap = await getDoc(docRef);

    if (!submissionSnap.exists()) throw new Error('Submission not found');
    const submissionData = submissionSnap.data();

    // Prevent self-confirmation
    if (submissionData.userId === userId) throw new Error('You cannot confirm your own price');

    // Prevent double-confirmation
    const confirmedBy: string[] = submissionData.confirmedBy || [];
    if (confirmedBy.includes(userId)) throw new Error('You have already confirmed this price');

    const today = new Date().toISOString().split('T')[0];
    const batch = writeBatch(db);

    batch.update(docRef, { confirmations: increment(1), confirmedBy: arrayUnion(userId) });

    const userRef = doc(db, 'users', userId);
    batch.update(userRef, { points: increment(2) });

    const missionRef = doc(db, `users/${userId}/daily_stats`, today);
    const missionSnap = await getDoc(missionRef);
    let missionData = { pricesAdded: 0, pricesConfirmed: 0, completed: false };
    if (missionSnap.exists()) missionData = missionSnap.data() as any;

    const newPricesConfirmed = missionData.pricesConfirmed + 1;
    const isNowCompleted = !missionData.completed && missionData.pricesAdded >= 2 && newPricesConfirmed >= 3;

    batch.set(missionRef, {
      date: today,
      pricesAdded: missionData.pricesAdded,
      pricesConfirmed: newPricesConfirmed,
      completed: isNowCompleted || missionData.completed,
    }, { merge: true });

    if (isNowCompleted) batch.update(userRef, { points: increment(50) });

    await batch.commit();
  },

  getRecentSubmissions(callback: (submissions: PriceSubmission[]) => void) {
    const q = query(collection(db, 'submissions'), orderBy('timestamp', 'desc'), limit(30));
    return onSnapshot(q, (snapshot) => {
      const submissions = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as PriceSubmission[];
      callback(submissions);
    }, (error) => {
      console.error('getRecentSubmissions error:', error);
    });
  },

  searchSubmissions(searchQuery: string, callback: (submissions: PriceSubmission[]) => void) {
    const q = query(collection(db, 'submissions'), orderBy('timestamp', 'desc'), limit(100));
    return onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as PriceSubmission[];
      const lower = searchQuery.toLowerCase().trim();
      const filtered = lower
        ? all.filter(s =>
            s.itemName.toLowerCase().includes(lower) ||
            s.storeName.toLowerCase().includes(lower) ||
            s.category.toLowerCase().includes(lower)
          )
        : all;
      callback(filtered);
    }, (error) => {
      console.error('searchSubmissions error:', error);
    });
  },

  getSubmissionsByCategory(category: string, callback: (submissions: PriceSubmission[]) => void) {
    let q;
    if (category === 'All' || !category) {
      q = query(collection(db, 'submissions'), orderBy('timestamp', 'desc'), limit(30));
    } else if (category === 'Best Deals') {
      q = query(collection(db, 'submissions'), orderBy('confirmations', 'desc'), limit(30));
    } else {
      q = query(collection(db, 'submissions'), where('category', '==', category), orderBy('timestamp', 'desc'), limit(30));
    }
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as PriceSubmission[]);
    }, (error) => {
      console.error('getSubmissionsByCategory error:', error);
    });
  },

  async getDailyMissions(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const missionRef = doc(db, `users/${userId}/daily_stats`, today);
    try {
      const snap = await getDoc(missionRef);
      if (snap.exists()) return snap.data();
      return { date: today, pricesAdded: 0, pricesConfirmed: 0, completed: false };
    } catch (error) {
      console.error('getDailyMissions error:', error);
      return { date: today, pricesAdded: 0, pricesConfirmed: 0, completed: false };
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
      return snap.docs.map(d => d.data() as PriceHistory);
    } catch (error) {
      console.error('getPriceHistory error:', error);
      return [];
    }
  },

  calculateTrend(history: PriceHistory[]): 'Rising' | 'Dropping' | 'Stable' {
    if (history.length < 2) return 'Stable';
    const recent = history[history.length - 1].price;
    const previous = history[history.length - 2].price;
    if (recent > previous * 1.05) return 'Rising';
    if (recent < previous * 0.95) return 'Dropping';
    return 'Stable';
  },

  getSmartInsight(history: PriceHistory[]): string {
    if (history.length < 3) return 'Buy now';
    const prices = history.map(h => h.price);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const current = prices[prices.length - 1];
    if (current < avg * 0.9) return 'Great deal! Price is below average — buy now';
    if (current > avg * 1.1) return 'Price is high right now. Consider waiting';
    return 'Fair price. Good time to buy';
  },

  async uploadImage(file: File, onProgress?: (progress: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, `submissions/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on(
        'state_changed',
        (snapshot) => { onProgress?.((snapshot.bytesTransferred / snapshot.totalBytes) * 100); },
        reject,
        () => { getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject); }
      );
    });
  },

  async getFeaturedShops() {
    const q = query(collection(db, 'shops'), where('isFeatured', '==', true), limit(5));
    try {
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Shop));
    } catch {
      return [];
    }
  },

  async getNearbySubmissions(center: [number, number], radiusInM: number): Promise<PriceSubmission[]> {
    const bounds = geohashQueryBounds(center, radiusInM);
    const promises = bounds.map(b =>
      getDocs(query(collection(db, 'submissions'), orderBy('geohash'), startAt(b[0]), endAt(b[1])))
    );
    try {
      const snapshots = await Promise.all(promises);
      const matchingDocs: PriceSubmission[] = [];
      for (const snap of snapshots) {
        for (const d of snap.docs) {
          const lat = d.get('location.lat');
          const lng = d.get('location.lng');
          const distanceInM = distanceBetween([lat, lng], center) * 1000;
          if (distanceInM <= radiusInM) {
            matchingDocs.push({ id: d.id, ...d.data() } as PriceSubmission);
          }
        }
      }
      return matchingDocs;
    } catch (error) {
      console.error('getNearbySubmissions error:', error);
      return [];
    }
  },

  async getUserActivity(userId: string, limitCount: number = 10) {
    const q = query(
      collection(db, 'submissions'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    try {
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as PriceSubmission));
    } catch {
      return [];
    }
  },

  async getMarketStats() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const todayQ = query(collection(db, 'submissions'), where('timestamp', '>=', Timestamp.fromDate(yesterday)));
      const snap = await getDocs(todayQ);
      const docs = snap.docs.map(d => d.data());
      const totalToday = docs.length;
      const avgPrice = totalToday > 0 ? docs.reduce((acc, d) => acc + (d.price || 0), 0) / totalToday : 0;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 8);
      const weekAgoYesterday = new Date();
      weekAgoYesterday.setDate(weekAgoYesterday.getDate() - 7);
      const oldQ = query(
        collection(db, 'submissions'),
        where('timestamp', '>=', Timestamp.fromDate(weekAgo)),
        where('timestamp', '<=', Timestamp.fromDate(weekAgoYesterday))
      );
      const oldSnap = await getDocs(oldQ);
      const oldDocs = oldSnap.docs.map(d => d.data());
      const oldAvg = oldDocs.length > 0 ? oldDocs.reduce((acc, d) => acc + (d.price || 0), 0) / oldDocs.length : avgPrice;
      const pctChange = oldAvg > 0 ? ((avgPrice - oldAvg) / oldAvg) * 100 : 0;
      return { totalToday, avgPrice, pctChange: pctChange.toFixed(1) };
    } catch {
      return { totalToday: 0, avgPrice: 0, pctChange: '0' };
    }
  },
};
