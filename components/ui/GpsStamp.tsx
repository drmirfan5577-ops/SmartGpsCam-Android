/**
 * GPS Stamp Card — matches reference image exactly
 * Uses offline-cached OSM tiles
 */
import React, { memo, useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { ReverseGeoResult, formatGpsTimestamp, getStaticMapUrl, getCachedTileUri } from '@/services/geocoding';
import { GpsData } from '@/hooks/useLocation';

interface GpsStampProps {
  gpsData: GpsData | null;
  geoResult: ReverseGeoResult | null;
  isGeoLoading?: boolean;
  capturedAt?: Date;
  visible?: boolean;
}

const GpsStamp = memo(({ gpsData, geoResult, isGeoLoading, capturedAt, visible = true }: GpsStampProps) => {
  if (!visible || !gpsData) return null;

  const now = capturedAt ?? new Date();
  const timestamp = formatGpsTimestamp(now);
  const lat = gpsData.latitude;
  const lng = gpsData.longitude;
  const latStr = `Lat ${Math.abs(lat).toFixed(6)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `Long ${Math.abs(lng).toFixed(6)}° ${lng >= 0 ? 'E' : 'W'}`;

  const [tileUri, setTileUri] = useState<string>(getStaticMapUrl(lat, lng, 16));

  useEffect(() => {
    let cancelled = false;
    getCachedTileUri(lat, lng, 16).then((uri) => {
      if (!cancelled) setTileUri(uri);
    });
    return () => { cancelled = true; };
  }, [lat, lng]);

  const locationName = geoResult?.displayName || (isGeoLoading ? 'Locating...' : 'Unknown Location');
  const flag = geoResult?.countryFlag || '🌍';
  const fullAddress = geoResult
    ? `${geoResult.plusCode}, ${geoResult.city}, ${geoResult.state}, ${geoResult.country}`
    : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

  return (
    <View style={styles.card}>
      {/* Left: Map tile thumbnail with pin */}
      <View style={styles.mapBox}>
        <Image
          source={{ uri: tileUri }}
          style={styles.mapImage}
          contentFit="cover"
          transition={200}
          cachePolicy="disk"
        />
        <View style={styles.pinContainer} pointerEvents="none">
          <MaterialIcons name="location-pin" size={28} color="#ea4335" />
        </View>
        <View style={styles.googleLabel}>
          <Text style={styles.googleText}>Maps</Text>
        </View>
      </View>

      {/* Right: Location info */}
      <View style={styles.info}>
        <Text style={styles.locationName} numberOfLines={2}>{locationName}</Text>
        <Text style={styles.flag}>{flag}</Text>
        <Text style={styles.address} numberOfLines={2}>{fullAddress}</Text>
        <Text style={styles.coords}>{latStr}  {lngStr}</Text>
        <Text style={styles.timestamp}>{timestamp}</Text>
      </View>
    </View>
  );
});

export default GpsStamp;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(40,40,40,0.92)',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  mapBox: {
    width: 110, height: 110,
    backgroundColor: '#ccc',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapImage: { ...StyleSheet.absoluteFillObject },
  pinContainer: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
    marginTop: -14,
  },
  googleLabel: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2,
  },
  googleText: { color: '#333', fontSize: 9, fontWeight: '700' },
  info: {
    flex: 1, paddingHorizontal: 10, paddingVertical: 8,
    justifyContent: 'center', gap: 2,
  },
  locationName: {
    color: '#ffffff', fontSize: 14, fontWeight: '700',
    lineHeight: 18, letterSpacing: 0.2,
  },
  flag: { fontSize: 16, marginTop: 1 },
  address: { color: '#cccccc', fontSize: 10, lineHeight: 14, marginTop: 1 },
  coords: {
    color: '#cccccc', fontSize: 10,
    fontFamily: 'monospace' as any, lineHeight: 14, marginTop: 2,
  },
  timestamp: {
    color: '#cccccc', fontSize: 10,
    fontFamily: 'monospace' as any, lineHeight: 14, marginTop: 2,
  },
});
