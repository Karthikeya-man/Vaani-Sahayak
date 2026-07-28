import { useState, useEffect, useCallback } from 'react';

export function useWeather(initialLocation = null) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [cachedAt, setCachedAt] = useState(null);

  const fetchWeather = useCallback(async ({ lat, lon, city }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (lat && lon) {
        params.append('lat', lat);
        params.append('lon', lon);
      } else if (city) {
        params.append('city', city);
      } else {
        throw new Error('Please provide lat/lon or city');
      }

      const response = await fetch(`/api/weather?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch weather');
      }

      const cachedHeader = response.headers.get('X-Cached-At');
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

      if (isOffline || cachedHeader || data.fetchedAt) {
        setIsCached(isOffline || !!cachedHeader);
        setCachedAt(cachedHeader || data.fetchedAt || new Date().toISOString());
      } else {
        setIsCached(false);
        setCachedAt(null);
      }

      setWeather(data);

      // Store in local backup
      try {
        localStorage.setItem('vaani_cached_weather', JSON.stringify({
          data,
          timestamp: cachedHeader || data.fetchedAt || new Date().toISOString()
        }));
      } catch (e) {}

    } catch (err) {
      // Offline fallback from localStorage
      try {
        const saved = localStorage.getItem('vaani_cached_weather');
        if (saved) {
          const parsed = JSON.parse(saved);
          setWeather(parsed.data);
          setIsCached(true);
          setCachedAt(parsed.timestamp);
          setError(null);
          return;
        }
      } catch (e) {}

      setError(err.message);
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchByGPS = useCallback(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by your browser");
      fetchWeather({ city: "Rajkot" });
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchWeather({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      (error) => {
        console.warn("Geolocation denied or failed:", error.message);
        fetchWeather({ city: "Rajkot" });
      },
      { timeout: 10000 }
    );
  }, [fetchWeather]);

  useEffect(() => {
    if (initialLocation) {
      if (initialLocation.lat && initialLocation.lon) {
         fetchWeather({ lat: initialLocation.lat, lon: initialLocation.lon });
      } else if (initialLocation.city) {
         fetchWeather({ city: initialLocation.city });
      } else {
         fetchByGPS();
      }
    }
  }, []);

  return { weather, loading, error, isCached, cachedAt, fetchWeather, fetchByGPS };
}
