import { MapPin, LogOut, Coins } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function TopAppBar() {
  const { user, logout } = useAuth();
  const [points, setPoints] = useState(0);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setPoints(doc.data().points || 0);
      }
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <header className="bg-surface sticky top-0 z-50 border-b border-surface-container">
      <div className="flex items-center justify-between px-6 py-4 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant/20 relative group">
            <img 
              alt="User profile" 
              className="w-full h-full object-cover" 
              src={user?.photoURL || "https://picsum.photos/seed/user/100/100"}
              referrerPolicy="no-referrer"
            />
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
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-low text-primary font-medium">
          <MapPin size={18} />
          <span className="text-sm">Cairo, Egypt</span>
        </div>
      </div>
    </header>
  );
}
