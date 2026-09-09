import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { reverseGeocode, ReverseGeoResult } from '@/services/geocoding';

export interface GpsData {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

export function useLocation() {
  const [gpsData, setGpsData] = useState<GpsData | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoResult, setGeoResult] = useState<ReverseGeoResult | null>(null);
  const [isGeoLoading, setIsGeoLoading] = useState(false);

  // Debounce geocoding — only re-fetch when moved ~100m
  const lastGeoKey = useRef<string>('');
  const geoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestPermission = useCallback(async () => {
    try {
      const fg = await Location.requestForegroundPermissionsAsync();
      const granted = fg.status === 'granted';
      setHasPermission(granted);
      return granted;
    } catch {
      setError('Location permission denied');
      return false;
    }
  }, []);

  const fetchReverseGeo = useCallback(async (lat: number, lng: number) => {
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (key === lastGeoKey.current) return;
    lastGeoKey.current = key;

    if (geoTimer.current) clearTimeout(geoTimer.current);
    geoTimer.current = setTimeout(async () => {
      setIsGeoLoading(true);
      try {
        const result = await reverseGeocode(lat, lng);
        if (result) setGeoResult(result);
      } finally {
        setIsGeoLoading(false);
      }
    }, 1500); // debounce 1.5s after GPS stabilizes
  }, []);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;

    const start = async () => {
      const granted = await requestPermission();
      if (!granted) return;
      setIsTracking(true);

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 0,
        },
        (loc) => {
          const data: GpsData = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            altitude: loc.coords.altitude,
            accuracy: loc.coords.accuracy,
            speed: loc.coords.speed,
            heading: loc.coords.heading,
            timestamp: loc.timestamp,
          };
          setGpsData(data);
          setError(null);
          // Trigger reverse geocoding
          fetchReverseGeo(data.latitude, data.longitude);
        }
      );
    };

    start();

    return () => {
      sub?.remove();
      setIsTracking(false);
      if (geoTimer.current) clearTimeout(geoTimer.current);
    };
  }, [requestPermission, fetchReverseGeo]);

  const formatCoord = (val: number, isLat: boolean): string => {
    const dir = isLat ? (val >= 0 ? 'N' : 'S') : val >= 0 ? 'E' : 'W';
    return `${Math.abs(val).toFixed(6)}° ${dir}`;
  };

  const formattedLat = gpsData ? formatCoord(gpsData.latitude, true) : '---';
  const formattedLon = gpsData ? formatCoord(gpsData.longitude, false) : '---';
  const formattedAlt = gpsData?.altitude != null ? `${gpsData.altitude.toFixed(1)} m` : '--- m';
  const formattedSpeed =
    gpsData?.speed != null ? `${(gpsData.speed * 3.6).toFixed(1)} km/h` : '0.0 km/h';
  const formattedAccuracy =
    gpsData?.accuracy != null ? `±${gpsData.accuracy.toFixed(0)} m` : '---';

  return {
    gpsData,
    hasPermission,
    isTracking,
    error,
    geoResult,
    isGeoLoading,
    formattedLat,
    formattedLon,
    formattedAlt,
    formattedSpeed,
    formattedAccuracy,
    requestPermission,
  };
}
