import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Filter, Navigation, Layers, Plus, List, Verified } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import MapContainer from '../components/map/MapContainer';
import { MarketService, PriceSubmission } from '../lib/MarketService';
import { cn } from '../lib/utils';
import { distanceBetween } from 'geofire-common';

const MAP_CATEGORIES = ['All', 'Coffee & Drinks', 'Groceries', 'Bakery', 'Vegetables', 'Dairy'];

export default function MapScreen() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<PriceSubmission[]>([]);
  const [center, setCenter] = useState({ lat: 30.0444, lng: 31.2357 });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'cheapest' | 'nearest'>('recent');
  const [selectedItem, setSelectedItem] = useState<PriceSubmission | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCenter(loc);
          fetchNearby(loc);
        },
        () => fetchNearby(center)
      );
    } else {
      fetchNearby(center);
    }
  }, []);

  const fetchNearby = async (loc: { lat: number; lng: number }) => {
    setLoading(true);
    try {
      const nearby = await MarketService.getNearbySubmissions([loc.lat, loc.lng], 10000);
      setSubmissions(nearby);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubmissions = useMemo(() => {
    let result = submissions.filter(s => {
      const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;
      const matchesSearch = !searchQuery.trim() || 
        s.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.storeName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });

    if (sortBy === 'cheapest') result.sort((a, b) => a.price - b.price);
    else if (sortBy === 'nearest') {
      result.sort((a, b) => {
        const da = distanceBetween([a.location.lat, a.location.lng], [center.lat, center.lng]);
        const db2 = distanceBetween([b.location.lat, b.location.lng], [center.lat, center.lng]);
        return da - db2;
      });
    } else {
      result.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
    }
    return result;
  }, [submissions, selectedCategory, searchQuery, sortBy, center]);

  const getDistanceLabel = (item: PriceSubmission) => {
    const km = distanceBetween([item.location.lat, item.location.lng], [center.lat, center.lng]);
    return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
  };

  return (
    <div className="h-screen -mt-[73px] relative overflow-hidden">
      {/* Overlays */}
      <div className="absolute top-24 left-6 right-6 z-10 space-y-4">
        <div className="flex items-center bg-white/90 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-2xl border border-outline-variant/10">
          <Search className="text-outline mr-4" size={20} />
          <input
            className="bg-transparent border-none focus:ring-0 w-full text-lg font-medium placeholder:text-outline"
            placeholder="Search nearby prices..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Filter className="text-outline cursor-pointer hover:text-primary transition-colors" size={20} />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {MAP_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap shadow-lg border transition-all',
                selectedCategory === cat ? 'bg-primary text-white border-primary' : 'bg-white text-on-surface-variant border-outline-variant/20'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {(['recent', 'cheapest', 'nearest'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={cn(
                'px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border capitalize',
                sortBy === s ? 'bg-tertiary text-white border-tertiary shadow-lg' : 'bg-white/80 backdrop-blur-md text-outline border-outline-variant/20'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="absolute inset-0 bg-surface-container-high">
        <MapContainer
          submissions={filteredSubmissions}
          center={center}
          onMarkerClick={(s) => setSelectedItem(s)}
        />

        {selectedItem && (
          <div className="absolute bottom-48 left-6 right-6 z-20 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white rounded-3xl p-4 shadow-2xl border border-outline-variant/20 flex gap-4 items-center relative">
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute -top-2 -right-2 w-8 h-8 bg-on-surface text-surface rounded-full flex items-center justify-center shadow-lg"
              >
                <Plus className="rotate-45" size={16} />
              </button>
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-surface-container-highest flex-shrink-0">
                {selectedItem.imageUrl ? (
                  <img src={selectedItem.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={selectedItem.itemName} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <MapPin size={24} className="text-primary" />
                  </div>
                )}
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {selectedItem.category}
                  </span>
                  {selectedItem.imageUrl && <Verified size={12} className="text-emerald-500" />}
                </div>
                <h3 className="font-bold text-on-surface truncate">{selectedItem.itemName}</h3>
                <p className="text-xs text-outline font-medium truncate">{selectedItem.storeName}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xl font-black text-primary">{selectedItem.price} <span className="text-xs font-bold">EGP</span></p>
                  <button
                    onClick={() => navigate(`/item/${selectedItem.id}`)}
                    className="bg-on-surface text-surface px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
                  >
                    Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute right-6 bottom-36 flex flex-col gap-4 z-10">
        <button
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition((pos) => {
                const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setCenter(loc);
                fetchNearby(loc);
              });
            }
          }}
          className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all"
        >
          <Navigation size={24} />
        </button>
        <button className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center text-outline hover:text-primary transition-all">
          <Layers size={24} />
        </button>
        <Link to="/add" className="w-14 h-14 rounded-2xl bg-primary shadow-xl flex items-center justify-center text-white hover:scale-110 active:scale-90 transition-all">
          <Plus size={28} />
        </Link>
      </div>

      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 w-full bg-white/80 backdrop-blur-2xl rounded-t-[3rem] p-8 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t border-outline-variant/10 z-10">
        <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full mx-auto mb-6"></div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline text-2xl font-black text-primary">
            {loading ? 'Searching...' : `${filteredSubmissions.length} Nearby`}
          </h2>
          <button className="text-primary font-bold flex items-center gap-2">
            <List size={18} />
            {filteredSubmissions.length} results
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {filteredSubmissions.length > 0 ? (
            filteredSubmissions.map(s => (
              <div
                key={s.id}
                onClick={() => navigate(`/item/${s.id}`)}
                className="min-w-[200px] bg-white rounded-2xl p-4 border border-outline-variant/10 shadow-md cursor-pointer hover:scale-105 transition-transform relative overflow-hidden"
              >
                {s.imageUrl && (
                  <div className="absolute top-2 right-2 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter flex items-center gap-0.5">
                    <Verified size={8} /> Photo
                  </div>
                )}
                <p className="font-bold text-on-surface truncate pr-8">{s.itemName}</p>
                <p className="text-[10px] text-outline truncate mb-1">{s.storeName}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-primary font-black">{s.price} EGP</p>
                  <p className="text-[10px] text-outline font-bold uppercase">{getDistanceLabel(s)}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="w-full py-10 text-center text-outline font-bold">
              {loading ? 'Loading nearby prices...' : 'No prices found nearby. Be the first to add one!'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
