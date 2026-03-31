import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { MarketService } from '../lib/MarketService';
import { GeocodingService } from '../lib/GeocodingService';
import { Camera, MapPin, Store, Tag, Coins, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const CATEGORIES = ['Groceries', 'Coffee & Drinks', 'Bakery', 'Electronics', 'Fashion', 'Vegetables', 'Dairy', 'Meat & Poultry', 'Cleaning', 'Other'];

export default function AddPriceScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    itemName: '',
    price: '',
    storeName: '',
    category: 'Groceries',
    address: '',
    lat: 30.0444,
    lng: 31.2357,
  });

  const fetchCurrentLocation = async () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({ ...prev, lat: latitude, lng: longitude, address: 'Fetching address...' }));
        const address = await GeocodingService.reverseGeocode(latitude, longitude);
        setFormData(prev => ({ ...prev, address }));
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        setError('Could not get your location. Please enter it manually.');
      }
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const max = 1200;
      if (width > height ? width > max : height > max) {
        if (width > height) { height *= max / width; width = max; }
        else { width *= max / height; height = max; }
      }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        if (blob) setImageFile(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
      }, 'image/jpeg', 0.85);
    };
    img.src = URL.createObjectURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setLoading(true);

    try {
      let imageUrl = '';
      if (imageFile) {
        imageUrl = await MarketService.uploadImage(imageFile, (p) => setUploadProgress(p));
      }

      await MarketService.submitPrice({
        itemName: formData.itemName.trim(),
        price: parseFloat(formData.price),
        currency: 'EGP',
        storeName: formData.storeName.trim(),
        category: formData.category,
        location: { lat: formData.lat, lng: formData.lng, address: formData.address || `${formData.lat.toFixed(4)}, ${formData.lng.toFixed(4)}` },
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userPhoto: user.photoURL || '',
        imageUrl: imageUrl || undefined,
      });
      setEarnedPoints(10);
      setSuccess(true);
      setTimeout(() => navigate('/'), 2500);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to submit price. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={64} className="text-primary" />
        </div>
        <h2 className="text-3xl font-black font-headline text-primary mb-2">Price Posted!</h2>
        <p className="text-on-surface-variant text-lg mb-8">
          You've earned <span className="text-tertiary font-bold">+{earnedPoints} Points</span> for contributing to the community.
        </p>
        <div className="flex items-center gap-2 text-tertiary font-bold bg-tertiary/10 px-6 py-3 rounded-full">
          <Coins size={20} />
          <span>Redirecting to home...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 pt-8 pb-20">
      <h1 className="font-headline text-3xl font-black text-primary mb-2">Post a Price</h1>
      <p className="text-on-surface-variant mb-10">Help others by sharing real-time prices from your local stores.</p>

      {error && (
        <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Photo */}
        <div className="space-y-2">
          <label className="text-sm font-bold uppercase tracking-widest text-outline ml-1">Evidence (Optional)</label>
          <label className="aspect-video bg-surface-container-highest rounded-2xl border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-surface-container-high transition-colors group relative overflow-hidden">
            {imagePreview ? (
              <>
                <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                {loading && uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-6">
                    <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden mb-2">
                      <div className="bg-primary h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest">Uploading {Math.round(uploadProgress)}%</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Camera size={32} className="text-primary" />
                </div>
                <p className="font-bold text-outline">Add a photo of the price tag</p>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </label>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-widest text-outline ml-1">Item Name</label>
            <div className="flex items-center bg-surface-container-low rounded-xl px-4 py-4 border border-outline-variant/20 focus-within:border-primary transition-colors">
              <Tag size={20} className="text-outline mr-3" />
              <input
                required
                className="bg-transparent border-none focus:ring-0 w-full text-lg font-medium"
                placeholder="e.g. Iced Latte, Milk, Bread"
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-widest text-outline ml-1">Price (EGP)</label>
              <div className="flex items-center bg-surface-container-low rounded-xl px-4 py-4 border border-outline-variant/20 focus-within:border-primary transition-colors">
                <span className="text-lg font-bold text-primary mr-2">£</span>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="bg-transparent border-none focus:ring-0 w-full text-lg font-bold text-primary"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-widest text-outline ml-1">Category</label>
              <select
                className="w-full bg-surface-container-low rounded-xl px-4 py-4 border border-outline-variant/20 focus:ring-primary focus:border-primary text-lg font-medium h-[64px]"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-widest text-outline ml-1">Store Name</label>
            <div className="flex items-center bg-surface-container-low rounded-xl px-4 py-4 border border-outline-variant/20 focus-within:border-primary transition-colors">
              <Store size={20} className="text-outline mr-3" />
              <input
                required
                className="bg-transparent border-none focus:ring-0 w-full text-lg font-medium"
                placeholder="e.g. Seoudi Market, Starbucks"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-widest text-outline ml-1">Location</label>
            <div className="flex items-center bg-surface-container-low rounded-xl px-4 py-4 border border-outline-variant/20 focus-within:border-primary transition-colors">
              <MapPin size={20} className="text-outline mr-3" />
              <input
                required
                className="bg-transparent border-none focus:ring-0 w-full text-lg font-medium"
                placeholder="e.g. Maadi, Cairo"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
              <button
                type="button"
                onClick={fetchCurrentLocation}
                disabled={geoLoading}
                className="text-primary font-bold text-xs uppercase tracking-widest hover:underline ml-2 shrink-0 flex items-center gap-1"
              >
                {geoLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                Use GPS
              </button>
            </div>
            <p className="text-[10px] text-outline font-bold uppercase ml-1">
              Coords: {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}
            </p>
          </div>
        </div>

        <button
          disabled={loading}
          type="submit"
          className="w-full signature-gradient text-white py-5 rounded-2xl font-bold text-xl shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 size={22} className="animate-spin" /> Posting...</> : 'Post Price'}
        </button>
      </form>
    </div>
  );
}
