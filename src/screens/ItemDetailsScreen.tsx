import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MarketService, PriceSubmission, PriceHistory } from '../lib/MarketService';
import { useAuth } from '../lib/AuthContext';
import { ChevronLeft, Share2, MapPin, Store, Clock, Verified, ThumbsUp, AlertTriangle, History, Lightbulb } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import PriceHistoryChart from '../components/market/PriceHistoryChart';
import TrendBadge from '../components/market/TrendBadge';

export default function ItemDetailsScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState<PriceSubmission | null>(null);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'submissions', id), (doc) => {
      if (doc.exists()) {
        const data = { id: doc.id, ...doc.data() } as PriceSubmission;
        setItem(data);
        
        // Fetch history once we have item details
        const itemId = MarketService.generateItemId(
          data.itemName, 
          data.storeName, 
          data.location.lat, 
          data.location.lng
        );
        MarketService.getPriceHistory(itemId).then(setHistory);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  const handleConfirm = async () => {
    if (!id || !user) return;
    await MarketService.confirmPrice(id, user.uid);
  };

  const trend = useMemo(() => MarketService.calculateTrend(history), [history]);
  const insight = useMemo(() => MarketService.getSmartInsight(history), [history]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  
  if (!item) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-8 text-center">
      <AlertTriangle size={48} className="text-outline mb-4" />
      <h1 className="text-2xl font-black text-on-surface mb-2">Item not found</h1>
      <button onClick={() => navigate('/')} className="text-primary font-bold">Go back home</button>
    </div>
  );

  const timeAgo = item.timestamp?.toDate ? formatDistanceToNow(item.timestamp.toDate(), { addSuffix: true }) : 'Just now';

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header Image */}
      <div className="relative h-96 w-full">
        <img 
          alt={item.itemName} 
          className="w-full h-full object-cover" 
          src={item.imageUrl || `https://picsum.photos/seed/${item.itemName}/800/600`}
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-6 left-6 right-6 flex justify-between">
          <button onClick={() => navigate(-1)} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center text-white hover:bg-white/40 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center text-white hover:bg-white/40 transition-colors">
            <Share2 size={24} />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-surface to-transparent"></div>
      </div>

      {/* Content */}
      <div className="px-6 -mt-12 relative z-10 space-y-8">
        <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-xl border border-outline-variant/10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">{item.category}</span>
                {item.imageUrl && (
                  <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    <Verified size={12} />
                    Photo Verified
                  </span>
                )}
                {item.verified && (
                  <span className="bg-tertiary/10 text-tertiary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                    <Verified size={12} />
                    Verified
                  </span>
                )}
              </div>
              <h1 className="font-headline text-4xl font-black text-on-surface">{item.itemName}</h1>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black text-primary font-headline">{item.price} <span className="text-sm font-bold">{item.currency}</span></p>
              <p className="text-xs text-outline font-bold uppercase tracking-tighter">Current Price</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 py-6 border-y border-outline-variant/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                <Store size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-outline uppercase tracking-widest">Store</p>
                <p className="font-bold">{item.storeName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-outline uppercase tracking-widest">Location</p>
                <p className="font-bold truncate max-w-[150px]">{item.location.address}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6">
            <div className="flex items-center gap-3">
              <img src={item.userPhoto || "https://picsum.photos/seed/user/40"} className="w-10 h-10 rounded-full border border-outline-variant/20" referrerPolicy="no-referrer" />
              <div>
                <p className="text-xs text-outline font-bold uppercase tracking-widest">Posted By</p>
                <p className="font-bold">{item.userName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-outline text-sm">
              <Clock size={16} />
              <span>{timeAgo}</span>
            </div>
          </div>
        </div>

        {/* Smart Insight */}
        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white shrink-0">
            <Lightbulb size={24} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-primary mb-1">Smart Insight</p>
            <p className="font-bold text-on-surface text-lg">{insight}</p>
          </div>
        </div>

        {/* Trust System */}
        <div className="bg-surface-container-low rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <ThumbsUp size={24} />
            </div>
            <div>
              <p className="font-bold text-lg">{item.confirmations} Confirmations</p>
              <p className="text-sm text-on-surface-variant">Is this price still accurate?</p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={handleConfirm}
              className="flex-1 md:flex-none bg-primary text-white px-8 py-4 rounded-full font-bold shadow-lg active:scale-95 transition-all"
            >
              Confirm Price
            </button>
            <button className="bg-surface-container-highest text-on-surface-variant px-5 py-4 rounded-full font-bold active:scale-95 transition-all">
              <AlertTriangle size={20} />
            </button>
          </div>
        </div>

        {/* Price History */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-2xl font-black text-on-surface flex items-center gap-2">
              <History size={24} className="text-primary" />
              Price History
            </h2>
            <TrendBadge trend={trend} />
          </div>
          
          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-outline-variant/10">
            <PriceHistoryChart history={history} currency={item.currency} />
          </div>

          <div className="bg-surface-container-low rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Recent Snapshots</h3>
            <div className="space-y-3">
              {history.slice().reverse().slice(0, 5).map((h, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-outline-variant/10 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
                      <Clock size={14} />
                    </div>
                    <span className="font-medium text-on-surface">
                      {new Date(h.timestamp.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <span className="font-black text-primary">{h.price} {item.currency}</span>
                </div>
              ))}
              {history.length === 0 && (
                <p className="text-sm text-on-surface-variant italic text-center py-4">No history snapshots found for this item.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
