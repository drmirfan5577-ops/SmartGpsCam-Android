// onspace-lint-disable: native-packages
/**
 * GPS Track Visualization Screen
 * Shows all GPS-tagged media as pins on a react-native-maps map
 * with a polyline connecting them in chronological order.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMediaLibrary, MediaItem } from '@/hooks/useMediaLibrary';
import { Colors, Spacing, FontSize, Radius, GlassShadow } from '@/constants/theme';

const { width } = Dimensions.get('window');

export default function GpsTrackScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { mediaItems, loadRecentMedia, hasPermission, requestPermission } = useMediaLibrary();

  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');

  useEffect(() => {
    const load = async () => {
      if (!hasPermission) await requestPermission();
      await loadRecentMedia();
    };
    load();
  }, []);

  const gpsItems = mediaItems
    .filter((m) => m.gps != null)
    .sort((a, b) => a.createdAt - b.createdAt);

  const polylineCoords = gpsItems.map((m) => ({
    latitude: m.gps!.latitude,
    longitude: m.gps!.longitude,
  }));

  const fitToMarkers = useCallback(() => {
    if (gpsItems.length === 0 || !mapRef.current) return;
    if (gpsItems.length === 1) {
      mapRef.current.animateToRegion({
        latitude: gpsItems[0].gps!.latitude,
        longitude: gpsItems[0].gps!.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      return;
    }
    mapRef.current.fitToCoordinates(polylineCoords, {
      edgePadding: { top: 60, right: 40, bottom: 220, left: 40 },
      animated: true,
    });
  }, [gpsItems, polylineCoords]);

  useEffect(() => {
    if (gpsItems.length > 0) {
      const timer = setTimeout(fitToMarkers, 600);
      return () => clearTimeout(timer);
    }
  }, [gpsItems.length]);

  const initialRegion: Region | undefined = gpsItems.length > 0 ? {
    latitude: gpsItems[gpsItems.length - 1].gps!.latitude,
    longitude: gpsItems[gpsItems.length - 1].gps!.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  } : undefined;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <LinearGradient
        colors={['#ffffff', Colors.gradEnd]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>GPS TRACK</Text>
          <Text style={styles.headerSub}>{gpsItems.length} location{gpsItems.length !== 1 ? 's' : ''} recorded</Text>
        </View>
        <View style={styles.mapTypeWrap}>
          {(['standard', 'satellite', 'hybrid'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.mapTypeBtn, mapType === t && styles.mapTypeBtnActive]}
              onPress={() => setMapType(t)}
            >
              <Text style={[styles.mapTypeTxt, mapType === t && { color: '#fff' }]}>
                {t[0].toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {gpsItems.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <MaterialIcons name="map" size={52} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No GPS Locations</Text>
          <Text style={styles.emptySub}>
            Capture photos or videos with GPS enabled to see them plotted here.
          </Text>
          <TouchableOpacity style={styles.goBtn} onPress={() => router.back()}>
            <MaterialIcons name="camera-alt" size={16} color="#fff" />
            <Text style={styles.goBtnTxt}>Go to Camera</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            mapType={mapType}
            provider={PROVIDER_DEFAULT}
            initialRegion={initialRegion}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {polylineCoords.length > 1 && (
              <Polyline
                coordinates={polylineCoords}
                strokeColor={Colors.primary}
                strokeWidth={3}
                lineDashPattern={[1]}
              />
            )}

            {gpsItems.map((item, index) => (
              <Marker
                key={item.id}
                coordinate={{
                  latitude: item.gps!.latitude,
                  longitude: item.gps!.longitude,
                }}
                onPress={() => setSelected(item)}
                anchor={{ x: 0.5, y: 1 }}
              >
                <View style={[
                  styles.markerWrap,
                  item.type === 'video' ? styles.markerVideo : styles.markerPhoto,
                  selected?.id === item.id && styles.markerSelected,
                ]}>
                  <MaterialIcons
                    name={item.type === 'video' ? 'videocam' : 'camera-alt'}
                    size={14} color="#fff"
                  />
                  <Text style={styles.markerNum}>{index + 1}</Text>
                </View>
                <View style={[
                  styles.markerTail,
                  item.type === 'video'
                    ? { borderTopColor: Colors.recording }
                    : { borderTopColor: Colors.primary },
                ]} />
              </Marker>
            ))}
          </MapView>

          <TouchableOpacity style={[styles.fitBtn, { top: insets.top + 80 }]} onPress={fitToMarkers}>
            <MaterialIcons name="fit-screen" size={20} color={Colors.primary} />
          </TouchableOpacity>

          {selected ? (
            <View style={[styles.detailCard, { paddingBottom: insets.bottom + 12 }]}>
              <View style={styles.detailRow}>
                <Image
                  source={{ uri: selected.uri }}
                  style={styles.detailThumb}
                  contentFit="cover"
                  transition={150}
                  cachePolicy="memory-disk"
                />
                <View style={styles.detailInfo}>
                  <View style={styles.detailTypeRow}>
                    <View style={[
                      styles.detailTypeBadge,
                      selected.type === 'video'
                        ? { backgroundColor: Colors.recording }
                        : { backgroundColor: Colors.primary },
                    ]}>
                      <MaterialIcons
                        name={selected.type === 'video' ? 'videocam' : 'camera-alt'}
                        size={10} color="#fff"
                      />
                      <Text style={styles.detailTypeTxt}>{selected.type.toUpperCase()}</Text>
                    </View>
                    {selected.resolution && (
                      <Text style={styles.detailRes}>{selected.resolution}</Text>
                    )}
                  </View>
                  <Text style={styles.detailCoord}>
                    {`${Math.abs(selected.gps!.latitude).toFixed(5)}° ${selected.gps!.latitude >= 0 ? 'N' : 'S'}`}
                  </Text>
                  <Text style={styles.detailCoord}>
                    {`${Math.abs(selected.gps!.longitude).toFixed(5)}° ${selected.gps!.longitude >= 0 ? 'E' : 'W'}`}
                  </Text>
                  {selected.gps?.altitude != null && (
                    <Text style={styles.detailAlt}>Alt: {selected.gps.altitude.toFixed(1)} m</Text>
                  )}
                  <Text style={styles.detailDate}>{new Date(selected.createdAt).toLocaleString()}</Text>
                </View>
                <TouchableOpacity style={styles.detailClose} onPress={() => setSelected(null)}>
                  <MaterialIcons name="close" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.trackListWrap, { paddingBottom: insets.bottom + 8 }]}>
              <Text style={styles.trackListTitle}>Track Points</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.trackList}
              >
                {gpsItems.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.trackChip, selected?.id === item.id && styles.trackChipActive]}
                    onPress={() => {
                      setSelected(item);
                      mapRef.current?.animateToRegion({
                        latitude: item.gps!.latitude,
                        longitude: item.gps!.longitude,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                      });
                    }}
                  >
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.trackChipThumb}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                    <View style={styles.trackChipInfo}>
                      <Text style={styles.trackChipNum}>#{index + 1}</Text>
                      <MaterialIcons
                        name={item.type === 'video' ? 'videocam' : 'camera-alt'}
                        size={10}
                        color={item.type === 'video' ? Colors.recording : Colors.primary}
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
    gap: Spacing.sm,
    ...GlassShadow, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 4,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.primaryDim,
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '900', letterSpacing: 2 },
  headerSub: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 1 },
  mapTypeWrap: { flexDirection: 'row', gap: 3 },
  mapTypeBtn: {
    width: 26, height: 26, borderRadius: 6,
    backgroundColor: Colors.background,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  mapTypeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  mapTypeTxt: { color: Colors.textMuted, fontSize: 10, fontWeight: '800' },
  map: { flex: 1 },
  fitBtn: {
    position: 'absolute', right: Spacing.md,
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    ...GlassShadow, elevation: 6,
  },
  markerWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingVertical: 4, paddingHorizontal: 7,
    borderRadius: 10, minWidth: 34, justifyContent: 'center',
  },
  markerPhoto: { backgroundColor: Colors.primary },
  markerVideo: { backgroundColor: Colors.recording },
  markerSelected: { transform: [{ scale: 1.2 }], borderWidth: 2, borderColor: '#fff' },
  markerNum: { color: '#fff', fontSize: 9, fontWeight: '800' },
  markerTail: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    alignSelf: 'center',
  },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  emptyIcon: {
    width: 100, height: 100, borderRadius: 28,
    backgroundColor: Colors.primaryDim,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg,
  },
  emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.xs },
  emptySub: {
    color: Colors.textSecondary, fontSize: FontSize.sm,
    textAlign: 'center', lineHeight: 20, marginBottom: Spacing.lg,
  },
  goBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
  },
  goBtnTxt: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  detailCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.surfaceBorder,
    ...GlassShadow, elevation: 12,
  },
  detailRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  detailThumb: {
    width: 72, height: 72, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceBorder,
  },
  detailInfo: { flex: 1, gap: 3 },
  detailTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  detailTypeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingVertical: 2, paddingHorizontal: 7, borderRadius: Radius.full,
  },
  detailTypeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  detailRes: { color: Colors.textMuted, fontSize: 9 },
  detailCoord: {
    color: Colors.textPrimary, fontSize: FontSize.xs,
    fontFamily: 'monospace' as any, fontWeight: '600',
  },
  detailAlt: { color: Colors.textSecondary, fontSize: FontSize.xs },
  detailDate: { color: Colors.textMuted, fontSize: FontSize.xs },
  detailClose: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.background,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  trackListWrap: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.surfaceBorder,
    ...GlassShadow, elevation: 12,
  },
  trackListTitle: {
    color: Colors.textSecondary, fontSize: FontSize.xs,
    fontWeight: '700', letterSpacing: 0.5,
    paddingHorizontal: Spacing.md, marginBottom: 6,
  },
  trackList: { paddingHorizontal: Spacing.md, gap: 8, paddingBottom: 4 },
  trackChip: {
    width: 60, borderRadius: Radius.md, overflow: 'hidden',
    borderWidth: 2, borderColor: Colors.surfaceBorder,
  },
  trackChipActive: { borderColor: Colors.primary },
  trackChipThumb: { width: 56, height: 48 },
  trackChipInfo: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 4, paddingVertical: 2,
    backgroundColor: Colors.surface,
  },
  trackChipNum: { color: Colors.textMuted, fontSize: 8, fontWeight: '700' },
});
