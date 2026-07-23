import { useState, useEffect, useCallback } from 'react';

export function useWeather(initialLocation = null) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

      setWeather(data);
    } catch (err) {
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
         fetchWeather({ lat: initialLocation.lat, lon: initialLocation.lon })
      } else if (initialLocation.city) {
         fetchWeather({ city: initialLocation.city });
      } else {
         fetchByGPS();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  return { weather, loading, error, fetchWeather, fetchByGPS };
}
