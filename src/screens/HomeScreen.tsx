import { Search, SlidersHorizontal, Map as MapIcon, TrendingDown, Verified, Store, Clock, PlusCircle, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MarketService, PriceSubmission, Shop } from '../lib/MarketService';
import { GeminiService } from '../lib/GeminiService';
import { useAuth } from '../lib/AuthContext';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import DailyMissionWidget from '../components/market/DailyMissionWidget';
import StreakIndicator from '../components/market/StreakIndicator';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MessageSquare, Sparkles } from 'lucide-react';

const categories = ["Best Deals", "Nearest", "Most Recent", "Vegetables", "Coffee & Drinks"];

export default function HomeScreen() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<PriceSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<any>(null);
  const [featuredShops, setFeaturedShops] = useState<Shop[]>([]);
  const [aiAdvice, setAiAdvice] = useState<string>("Analyzing market trends...");

  useEffect(() => {
    const fetchFeatured = async () => {
      const shops = await MarketService.getFeaturedShops();
      if (shops) setFeaturedShops(shops);
    };
    fetchFeatured();

    const unsubscribe = MarketService.getRecentSubmissions((data) => {
      setSubmissions(data);
      setLoading(false);
      
      // Get AI advice based on recent submissions
      if (data.length > 0) {
        GeminiService.getSmartAdvice(data).then(setAiAdvice);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setUserStats(doc.data());
      }
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto px-6 pt-8 space-y-10">
      {/* Welcome & Streak */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-4xl font-black text-on-surface tracking-tight">
            Hello, <span className="text-primary">{user?.displayName?.split(' ')[0]}</span>!
          </h1>
          <p className="text-on-surface-variant font-medium">Ready to find the best deals today?</p>
        </div>
        {userStats?.currentStreak > 0 && (
          <StreakIndicator streak={userStats.currentStreak} size="lg" />
        )}
      </div>

      {/* Search Section */}
      <section>
        <div className="relative max-w-2xl mx-auto">
          <div className="flex items-center bg-surface-container-highest rounded-xl px-6 py-4 group focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-300">
            <Search className="text-outline mr-4" size={20} />
            <input 
              className="bg-transparent border-none focus:ring-0 w-full text-lg font-medium placeholder:text-outline" 
              placeholder="Search coffee, groceries..." 
              type="text"
            />
            <SlidersHorizontal className="text-outline cursor-pointer hover:text-primary transition-colors" size={20} />
          </div>
        </div>
      </section>

      {/* Daily Missions & Market Volatility */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          {user && <DailyMissionWidget userId={user.uid} />}
        </div>
        
        <div className="lg:col-span-2 bg-gradient-to-br from-primary to-emerald-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-primary/20">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 h-full">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={20} className="text-emerald-300" />
                <h2 className="font-headline text-3xl font-black">Smart AI Insights</h2>
              </div>
              <p className="text-emerald-100 text-lg mb-6 opacity-90 leading-relaxed font-medium italic">"{aiAdvice}"</p>
              <div className="flex flex-wrap gap-4">
                <Link to="/chat" className="bg-white text-primary px-6 py-3 rounded-full flex items-center gap-2 font-black uppercase tracking-widest text-xs shadow-lg hover:scale-105 transition-all">
                  <MessageSquare size={16} />
                  Ask PricePal AI
                </Link>
                <div className="bg-white/20 backdrop-blur-md px-4 py-3 rounded-full flex items-center gap-2">
                  <TrendingDown size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Market is -4% vs yesterday</span>
                </div>
              </div>
            </div>
            <div className="w-full md:w-48 aspect-square bg-white/10 backdrop-blur-2xl rounded-full border border-white/20 flex flex-col items-center justify-center shrink-0 shadow-inner">
              <span className="text-5xl font-black mb-1">94%</span>
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-70 text-center">Price Trust Score</span>
            </div>
          </div>
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary-container/20 rounded-full blur-3xl"></div>
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-tertiary/20 rounded-full blur-3xl"></div>
        </div>
      </div>

      {/* Categories */}
      <section className="overflow-x-auto no-scrollbar flex gap-3 pb-2">
        {categories.map((cat, i) => (
          <button 
            key={cat}
            className={`px-6 py-3 rounded-full whitespace-nowrap transition-all font-semibold ${
              i === 0 ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
            }`}
          >
            {cat}
          </button>
        ))}
      </section>

      {/* Featured Shops */}
      {featuredShops.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-2xl font-black text-on-surface uppercase tracking-tight">Featured Shops</h2>
            <Link to="/map" className="text-primary font-bold text-xs uppercase tracking-widest hover:underline">See All</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">
            {featuredShops.map((shop) => (
              <div key={shop.id} className="min-w-[200px] bg-surface-container rounded-2xl p-4 border border-outline-variant/10 hover:border-primary/30 transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {shop.logoUrl ? (
                    <img src={shop.logoUrl} alt={shop.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <Store className="text-primary" size={24} />
                  )}
                </div>
                <h3 className="font-bold text-on-surface mb-1">{shop.name}</h3>
                <p className="text-[10px] text-on-surface-variant uppercase font-black tracking-widest">{shop.category}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured Bento Feed */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface-container-highest animate-pulse rounded-lg h-64"></div>
          ))
        ) : (
          <>
            {submissions.map((item, index) => (
              <div key={item.id} className={cn(index === 1 ? "lg:row-span-2" : "")}>
                <PriceCard item={item} isLarge={index === 1} />
              </div>
            ))}
            
            {/* Market Volatility Index - Always show or show conditionally */}
            <div className="lg:col-span-2 bg-gradient-to-br from-primary to-emerald-800 rounded-lg p-8 text-white relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1">
                  <h2 className="font-headline text-3xl font-black mb-4">Market Volatility Index</h2>
                  <p className="text-emerald-100 text-lg mb-6 opacity-90">Prices in New Cairo are stabilizing. It's a great time to stock up on dairy and bakery items.</p>
                  <div className="flex gap-4">
                    <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-xs font-bold uppercase tracking-widest">Live Updates</span>
                    </div>
                    <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2">
                      <TrendingDown size={14} />
                      <span className="text-xs font-bold uppercase tracking-widest">-4% vs yesterday</span>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-48 aspect-square bg-white/10 backdrop-blur-2xl rounded-full border border-white/20 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black mb-1">94%</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-70">Price Trust Score</span>
                </div>
              </div>
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary-container/20 rounded-full blur-3xl"></div>
              <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-tertiary/20 rounded-full blur-3xl"></div>
            </div>
          </>
        )}
      </section>

      {/* Map Toggle FAB */}
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40">
        <Link to="/map" className="flex items-center gap-3 bg-on-surface text-surface px-8 py-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300">
          <MapIcon size={20} />
          <span className="font-bold tracking-tight">View on Map</span>
        </Link>
      </div>
    </div>
  );
}

function PriceCard({ item, isLarge }: { item: PriceSubmission; isLarge?: boolean }) {
  const timeAgo = item.timestamp?.toDate ? formatDistanceToNow(item.timestamp.toDate(), { addSuffix: true }) : 'Just now';

  return (
    <Link to={`/item/${item.id}`} className={cn(
      "group bg-surface-container-lowest rounded-lg overflow-hidden border transition-all duration-500 flex flex-col h-full",
      item.isSponsored ? "border-amber-500/30 bg-amber-50/10 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/10" : "border-outline-variant/15 hover:shadow-xl"
    )}>
      <div className={cn("relative overflow-hidden", isLarge ? "flex-grow" : "h-48")}>
        {item.imageUrl && (
          <div className="absolute top-4 right-4 z-10">
            <span className="bg-emerald-500/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg">
              <Verified size={12} />
              Photo Verified
            </span>
          </div>
        )}
        {item.isSponsored && (
          <div className="absolute top-4 right-4 z-10">
            <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
              Sponsored
            </span>
          </div>
        )}
        {item.verified && (
          <div className="absolute top-4 left-4">
            <span className="bg-tertiary-container/90 backdrop-blur-md text-on-tertiary-container px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1">
              <Verified size={14} className="fill-current" />
              Verified Best
            </span>
          </div>
        )}
        {isLarge && (
          <div className="absolute bottom-6 left-6 right-6">
            <div className="bg-white/80 backdrop-blur-xl p-6 rounded-lg shadow-lg">
              <p className="text-xs font-bold text-tertiary uppercase tracking-tighter mb-1">Featured Deal</p>
              <h3 className="font-headline text-2xl font-black mb-3">{item.itemName}</h3>
              <div className="flex items-end justify-between">
                <div>
                  <div className="flex items-center text-sm gap-1 text-on-surface-variant mb-1">
                    <MapIcon size={14} />
                    <span>{item.storeName}</span>
                  </div>
                  <p className="text-3xl font-black text-primary font-headline">{item.price} <span className="text-sm font-bold">EGP</span></p>
                </div>
                <button className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center active:scale-90 transition-transform">
                  <PlusCircle size={24} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {!isLarge && (
        <div className="p-6">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-headline text-xl font-bold text-on-surface">{item.itemName}</h3>
            <p className="text-2xl font-extrabold text-primary font-headline">{item.price} <span className="text-xs font-medium text-outline">EGP</span></p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center text-on-surface-variant text-sm gap-2">
              <Store size={18} />
              <span>{item.storeName}</span>
            </div>
            <div className="flex items-center text-outline text-xs gap-2">
              <Clock size={16} />
              <span>{timeAgo}</span>
            </div>
          </div>
        </div>
      )}
    </Link>
  );
}
