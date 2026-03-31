const CACHE_KEY = 'geocoding_cache';

interface GeocodingCache {
  [key: string]: string;
}

const getCache = (): GeocodingCache => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch { return {}; }
};

const setCache = (lat: number, lng: number, address: string) => {
  try {
    const cache = getCache();
    cache[`${lat.toFixed(6)},${lng.toFixed(6)}`] = address;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
};

const getMapsApiKey = (): string => {
  return (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';
};

export const GeocodingService = {
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    const cache = getCache();
    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    if (cache[key]) return cache[key];

    const apiKey = getMapsApiKey();
    if (!apiKey) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      const data = await response.json();
      if (data.status === 'OK' && data.results.length > 0) {
        const address = data.results[0].formatted_address;
        setCache(lat, lng, address);
        return address;
      }
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Geocoding error:', error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  },

  async forwardGeocode(address: string): Promise<{ lat: number; lng: number } | null> {
    const apiKey = getMapsApiKey();
    if (!apiKey) return null;
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
      );
      const data = await response.json();
      if (data.status === 'OK' && data.results.length > 0) {
        const loc = data.results[0].geometry.location;
        return { lat: loc.lat, lng: loc.lng };
      }
      return null;
    } catch {
      return null;
    }
  },
};
