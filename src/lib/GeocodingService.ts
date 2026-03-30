import firebaseConfig from '../../firebase-applet-config.json';

const API_KEY = firebaseConfig.apiKey;
const CACHE_KEY = 'geocoding_cache';

interface GeocodingCache {
  [key: string]: string;
}

const getCache = (): GeocodingCache => {
  const cached = localStorage.getItem(CACHE_KEY);
  return cached ? JSON.parse(cached) : {};
};

const setCache = (lat: number, lng: number, address: string) => {
  const cache = getCache();
  cache[`${lat.toFixed(6)},${lng.toFixed(6)}`] = address;
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
};

export const GeocodingService = {
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    const cache = getCache();
    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    
    if (cache[key]) {
      return cache[key];
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const address = data.results[0].formatted_address;
        setCache(lat, lng, address);
        return address;
      }
      
      return 'Unknown Location';
    } catch (error) {
      console.error('Geocoding error:', error);
      return 'Unknown Location';
    }
  }
};
