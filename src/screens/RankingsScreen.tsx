import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trophy, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';

interface LeaderboardUser {
  id: string;
  displayName: string;
  photoURL: string;
  points: number;
  pricesAdded: number;
  currentStreak?: number;
}

const getRank = (points: number) => {
  if (points >= 5000) return 'Elite Contributor';
  if (points >= 1000) return 'Top Contributor';
  if (points >= 200) return 'Active Reporter';
  return 'Contributor';
};

export default function RankingsScreen() {
  const { user } = useAuth();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('points', 'desc'), limit(20));
    const unsub = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as LeaderboardUser[]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const myRank = user ? users.findIndex(u => u.id === user.uid) + 1 : null;

  return (
    <div className="max-w-2xl mx-auto px-6 pt-8 pb-20 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="font-headline text-4xl font-black text-primary">Market Leaders</h1>
        <p className="text-on-surface-variant">Top contributors helping the community save.</p>
        {myRank && myRank > 0 && (
          <p className="text-sm font-bold text-primary">You are ranked #{myRank}</p>
        )}
      </div>

      {/* Top 3 Podium */}
      {!loading && users.length >= 3 && (
        <div className="flex items-end justify-center gap-4 pt-10 pb-6">
          <PodiumItem user={users[1]} rank={2} height="h-32" color="bg-slate-300" isMe={user?.uid === users[1]?.id} />
          <PodiumItem user={users[0]} rank={1} height="h-44" color="bg-yellow-400" isMain isMe={user?.uid === users[0]?.id} />
          <PodiumItem user={users[2]} rank={3} height="h-24" color="bg-amber-600" isMe={user?.uid === users[2]?.id} />
        </div>
      )}

      {/* List */}
      <div className="bg-surface-container-lowest rounded-3xl overflow-hidden border border-outline-variant/10 shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-on-surface-variant">Loading leaderboard...</div>
        ) : (
          users.slice(3).map((u, index) => (
            <LeaderboardRow key={u.id} user={u} rank={index + 4} isMe={user?.uid === u.id} />
          ))
        )}
      </div>
    </div>
  );
}

const PodiumItem: React.FC<{ user: LeaderboardUser; rank: number; height: string; color: string; isMain?: boolean; isMe?: boolean }> = ({ user, rank, height, color, isMain, isMe }) => {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div className={cn('rounded-full p-1', isMain ? 'bg-gradient-to-tr from-yellow-600 to-yellow-200' : 'bg-outline-variant/20', isMe && 'ring-4 ring-primary')}>
          <img
            src={user.photoURL || `https://picsum.photos/seed/${user.id}/100`}
            className={cn('rounded-full object-cover border-4 border-white', isMain ? 'w-24 h-24' : 'w-16 h-16')}
            referrerPolicy="no-referrer"
            alt={user.displayName}
          />
        </div>
        <div className={cn('absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg', color)}>
          {rank}
        </div>
      </div>
      <div className="text-center">
        <p className={cn('font-bold text-on-surface truncate max-w-[100px]', isMe && 'text-primary')}>{user.displayName}</p>
        <p className="text-primary font-black text-sm">{user.points} pts</p>
      </div>
      <div className={cn('w-20 rounded-t-xl opacity-20', height, color)}></div>
    </div>
  );
};

const LeaderboardRow: React.FC<{ user: LeaderboardUser; rank: number; isMe?: boolean }> = ({ user, rank, isMe }) => {
  return (
    <div className={cn('flex items-center justify-between p-5 border-b border-outline-variant/5 last:border-0 transition-colors', isMe ? 'bg-primary/5' : 'hover:bg-surface-container-low')}>
      <div className="flex items-center gap-4">
        <span className={cn('w-6 text-center font-black', isMe ? 'text-primary' : 'text-outline')}>{rank}</span>
        <img
          src={user.photoURL || `https://picsum.photos/seed/${user.id}/40`}
          className={cn('w-12 h-12 rounded-full border', isMe ? 'border-primary' : 'border-outline-variant/20')}
          referrerPolicy="no-referrer"
          alt={user.displayName}
        />
        <div>
          <p className={cn('font-bold text-on-surface', isMe && 'text-primary')}>{user.displayName} {isMe && '(You)'}</p>
          <p className="text-xs text-outline font-medium uppercase tracking-widest">{getRank(user.points)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-black text-primary">{user.points} pts</p>
        <div className="flex items-center gap-1 text-[10px] text-on-surface-variant font-bold uppercase">
          <TrendingUp size={10} />
          <span>{user.pricesAdded || 0} Posts</span>
        </div>
      </div>
    </div>
  );
};
