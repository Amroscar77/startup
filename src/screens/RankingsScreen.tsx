import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trophy, Medal, Star, TrendingUp, User as UserIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface LeaderboardUser {
  id: string;
  displayName: string;
  photoURL: string;
  points: number;
  rank: string;
  pricesAdded: number;
}

export default function RankingsScreen() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('points', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeaderboardUser[];
      setUsers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-6 pt-8 pb-20 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="font-headline text-4xl font-black text-primary">Market Leaders</h1>
        <p className="text-on-surface-variant">Top contributors helping the community save.</p>
      </div>

      {/* Top 3 Podium */}
      {!loading && users.length >= 3 && (
        <div className="flex items-end justify-center gap-4 pt-10 pb-6">
          {/* 2nd Place */}
          <PodiumItem user={users[1]} rank={2} height="h-32" color="bg-slate-300" />
          {/* 1st Place */}
          <PodiumItem user={users[0]} rank={1} height="h-44" color="bg-yellow-400" isMain />
          {/* 3rd Place */}
          <PodiumItem user={users[2]} rank={3} height="h-24" color="bg-amber-600" />
        </div>
      )}

      {/* List */}
      <div className="bg-surface-container-lowest rounded-3xl overflow-hidden border border-outline-variant/10 shadow-xl">
        {loading ? (
          <div className="p-8 text-center">Loading leaderboard...</div>
        ) : (
          users.slice(3).map((user, index) => (
            <LeaderboardRow key={user.id} user={user} rank={index + 4} />
          ))
        )}
      </div>
    </div>
  );
}

const PodiumItem: React.FC<{ user: LeaderboardUser; rank: number; height: string; color: string; isMain?: boolean }> = ({ user, rank, height, color, isMain }) => {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div className={cn(
          "rounded-full p-1",
          isMain ? "bg-gradient-to-tr from-yellow-600 to-yellow-200" : "bg-outline-variant/20"
        )}>
          <img 
            src={user.photoURL || "https://picsum.photos/seed/user/100"} 
            className={cn("rounded-full object-cover border-4 border-white", isMain ? "w-24 h-24" : "w-16 h-16")}
            referrerPolicy="no-referrer"
          />
        </div>
        <div className={cn(
          "absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg",
          color
        )}>
          {rank}
        </div>
      </div>
      <div className="text-center">
        <p className="font-bold text-on-surface truncate max-w-[100px]">{user.displayName}</p>
        <p className="text-primary font-black text-sm">{user.points} pts</p>
      </div>
      <div className={cn("w-20 rounded-t-xl opacity-20", height, color)}></div>
    </div>
  );
};

const LeaderboardRow: React.FC<{ user: LeaderboardUser; rank: number }> = ({ user, rank }) => {
  return (
    <div className="flex items-center justify-between p-5 border-b border-outline-variant/5 last:border-0 hover:bg-surface-container-low transition-colors">
      <div className="flex items-center gap-4">
        <span className="w-6 text-center font-black text-outline">{rank}</span>
        <img 
          src={user.photoURL || "https://picsum.photos/seed/user/40"} 
          className="w-12 h-12 rounded-full border border-outline-variant/20"
          referrerPolicy="no-referrer"
        />
        <div>
          <p className="font-bold text-on-surface">{user.displayName}</p>
          <p className="text-xs text-outline font-medium uppercase tracking-widest">{user.rank || 'Contributor'}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-black text-primary">{user.points} pts</p>
        <div className="flex items-center gap-1 text-[10px] text-on-surface-variant font-bold uppercase">
          <TrendingUp size={10} />
          <span>{user.pricesAdded} Posts</span>
        </div>
      </div>
    </div>
  );
};
