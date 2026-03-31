import { MapPin, LogOut, Coins } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { GeocodingService } from '../../lib/GeocodingService';

export default function TopAppBar() {
  const { user, logout } = useAuth();
  const [points, setPoints] = useState(0);
  const [locationLabel, setLocationLabel] = useState('Cairo, Egypt');

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (d) => {
      if (d.exists()) setPoints(d.data().points || 0);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const addr = await GeocodingService.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        // Show only city/district level (first two parts)
        const parts = addr.split(',');
        setLocationLabel(parts.slice(0, 2).join(',').trim());
      } catch {}
    });
  }, []);

  const avatarUrl = user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'U')}&background=006d37&color=fff&size=80`;

  return (
    <header className="bg-surface sticky top-0 z-50 border-b border-surface-container">
      <div className="flex items-center justify-between px-6 py-4 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant/20 relative group">
            <img alt="User profile" className="w-full h-full object-cover" src={avatarUrl} referrerPolicy="no-referrer" />
            <button
              onClick={logout}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
            >
              <LogOut size={16} />
            </button>
          </div>
          <div>
            <h1 className="font-headline text-lg font-bold tracking-tight text-primary leading-tight">The Editorial Market</h1>
            <div className="flex items-center gap-1 text-tertiary font-bold text-xs">
              <Coins size={12} />
              <span>{points} Points</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-low text-primary font-medium max-w-[180px]">
          <MapPin size={18} className="shrink-0" />
          <span className="text-sm truncate">{locationLabel}</span>
        </div>
      </div>
    </header>
  );
}
