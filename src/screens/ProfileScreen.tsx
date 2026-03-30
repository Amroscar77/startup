import React from 'react';
import { useAuth } from '../lib/AuthContext';
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Settings, Award, History, ShieldCheck, MapPin, LogOut, Coins, Zap, Bell, Flame } from 'lucide-react';
import { NotificationService } from '../lib/NotificationService';
import { cn } from '../lib/utils';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setUserData(doc.data());
      }
    });
    return () => unsubscribe();
  }, [user]);

  const handleEnableNotifications = async () => {
    if (!user) return;
    setNotifLoading(true);
    try {
      await NotificationService.requestPermission(user.uid);
    } catch (error) {
      console.error(error);
    } finally {
      setNotifLoading(false);
    }
  };

  if (!userData) return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto pb-20">
      {/* Header */}
      <div className="signature-gradient pt-16 pb-24 px-8 relative overflow-hidden">
        <div className="absolute top-6 right-6 flex gap-3">
          <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
            <Settings size={20} />
          </button>
          <button onClick={logout} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
            <LogOut size={20} />
          </button>
        </div>
        
        <div className="flex flex-col items-center text-center text-white relative z-10">
          <div className="relative mb-4">
            <img 
              src={user?.photoURL || "https://picsum.photos/seed/user/120"} 
              className="w-28 h-28 rounded-full border-4 border-white/30 shadow-2xl"
              referrerPolicy="no-referrer"
            />
            {userData.currentStreak > 0 && (
              <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                <Flame size={20} className="fill-current" />
              </div>
            )}
          </div>
          <h1 className="text-3xl font-black font-headline mb-1">{userData.displayName}</h1>
          <div className="flex items-center gap-2 opacity-80 text-sm font-bold uppercase tracking-widest">
            <MapPin size={14} />
            <span>{userData.location || 'Cairo, Egypt'}</span>
          </div>
          
          {userData.currentStreak > 0 && (
            <div className="mt-4 bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Flame size={14} className="text-orange-300" />
              {userData.currentStreak} Day Streak
            </div>
          )}
        </div>

        {/* Abstract shapes */}
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 -mt-12 relative z-10 grid grid-cols-4 gap-3">
        <StatCard icon={<Coins size={18} />} label="Points" value={userData.points || 0} color="text-yellow-600" />
        <StatCard icon={<Zap size={18} />} label="Posts" value={userData.pricesAdded || 0} color="text-primary" />
        <StatCard icon={<Flame size={18} />} label="Streak" value={userData.currentStreak || 0} color="text-orange-600" />
        <StatCard icon={<ShieldCheck size={18} />} label="Trust" value={`${userData.trustScore || 0}%`} color="text-emerald-600" />
      </div>

      {/* Content Sections */}
      <div className="px-6 mt-10 space-y-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline text-xl font-black text-primary flex items-center gap-2">
              <Award size={24} />
              Achievements
            </h2>
            <button className="text-primary font-bold text-sm">View All</button>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            <AchievementBadge icon="🛒" label="First Post" color="bg-emerald-100" />
            {userData.maxStreak >= 7 && <AchievementBadge icon="🔥" label="7 Day Streak" color="bg-orange-100" />}
            {userData.points >= 1000 && <AchievementBadge icon="💎" label="Top 10%" color="bg-purple-100" />}
            {userData.trustScore >= 90 && <AchievementBadge icon="🤝" label="Trusted" color="bg-blue-100" />}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-headline text-xl font-black text-primary flex items-center gap-2">
            <Bell size={24} />
            Notifications
          </h2>
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 p-6 shadow-lg flex items-center justify-between">
            <div>
              <p className="font-bold text-on-surface">Push Notifications</p>
              <p className="text-sm text-outline font-medium">Get alerts for price drops nearby</p>
            </div>
            <button 
              onClick={handleEnableNotifications}
              disabled={notifLoading}
              className={cn(
                "px-6 py-2 rounded-full font-bold text-sm transition-all shadow-md",
                userData.fcmTokens?.length > 0 
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                  : "bg-primary text-white hover:scale-105 active:scale-95"
              )}
            >
              {notifLoading ? 'Enabling...' : userData.fcmTokens?.length > 0 ? 'Enabled' : 'Enable'}
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-headline text-xl font-black text-primary flex items-center gap-2">
            <History size={24} />
            Recent Activity
          </h2>
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden shadow-lg">
            <ActivityItem title="Posted Price: Iced Latte" date="2 hours ago" points={10} />
            <ActivityItem title="Confirmed Price: Bread" date="Yesterday" points={2} />
            {userData.currentStreak > 1 && <ActivityItem title="Streak Maintained!" date="Today" points={0} />}
          </div>
        </section>

        <button 
          onClick={logout}
          className="w-full py-4 rounded-2xl border-2 border-outline-variant/20 text-outline font-bold flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: any; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-xl border border-outline-variant/5 flex flex-col items-center text-center">
      <div className={cn("mb-2", color)}>{icon}</div>
      <p className="text-xl font-black font-headline text-on-surface">{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-widest text-outline">{label}</p>
    </div>
  );
}

function AchievementBadge({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-2 min-w-[80px]">
      <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner", color)}>
        {icon}
      </div>
      <p className="text-[10px] font-bold text-center text-on-surface-variant uppercase tracking-tighter leading-tight">{label}</p>
    </div>
  );
}

function ActivityItem({ title, date, points }: { title: string; date: string; points: number }) {
  return (
    <div className="flex items-center justify-between p-5 border-b border-outline-variant/5 last:border-0">
      <div>
        <p className="font-bold text-on-surface">{title}</p>
        <p className="text-xs text-outline font-medium">{date}</p>
      </div>
      <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
        +{points} pts
      </div>
    </div>
  );
}
