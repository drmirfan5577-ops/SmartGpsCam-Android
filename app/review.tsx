/**
 * Photo / Video Review Screen
 * Shown after every capture — user can Save, Retake, or Share.
 * GPS stamp card overlaid on the preview exactly like the reference image.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import GpsStamp from '@/components/ui/GpsStamp';
import { Colors, Spacing, FontSize, Radius, GlassShadow } from '@/constants/theme';
import { GpsData } from '@/hooks/useLocation';
import { ReverseGeoResult, formatGpsTimestamp } from '@/services/geocoding';
import { useAlert } from '@/template';

const { width, height } = Dimensions.get('window');

export default function ReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { saveMedia } = useMediaLibrary();

  const params = useLocalSearchParams<{
    uri: string;
    type: string;
    resolution: string;
    gps: string;
    geo: string;
  }>();

  const uri = params.uri ?? '';
  const type = (params.type ?? 'photo') as 'photo' | 'video';
  const resolution = params.resolution ?? 'Full HD';

  const gpsData: GpsData | null = params.gps ? JSON.parse(params.gps) : null;
  const geoResult: ReverseGeoResult | null = params.geo ? JSON.parse(params.geo) : null;

  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [saved, setSaved] = useState(false);
  const capturedAt = useState(() => new Date())[0];

  const handleSave = useCallback(async () => {
    if (saving || saved) return;
    setSaving(true);
    try {
      const gpsStamp = gpsData ? {
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        altitude: gpsData.altitude,
        accuracy: gpsData.accuracy,
        speed: gpsData.speed,
      } : undefined;

      const item = await saveMedia(uri, type, { gps: gpsStamp, resolution });
      if (item) {
        setSaved(true);
        setTimeout(() => router.back(), 300);
      } else {
        showAlert('Save Failed', 'Could not save to gallery. Check storage permissions.');
      }
    } catch {
      showAlert('Error', 'Failed to save media.');
    } finally {
      setSaving(false);
    }
  }, [saving, saved, gpsData, uri, type, resolution, saveMedia, router, showAlert]);

  const handleDiscard = useCallback(() => {
    router.back();
  }, [router]);

  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        showAlert('Not Available', 'Sharing is not supported on this device.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: type === 'video' ? 'video/mp4' : 'image/jpeg',
        dialogTitle: `Share ${type}`,
        UTI: type === 'video' ? 'public.movie' : 'public.jpeg',
      });
    } catch {
      showAlert('Error', 'Share failed.');
    } finally {
      setSharing(false);
    }
  }, [uri, type, showAlert]);

  const locationLabel = geoResult?.displayName ||
    (gpsData ? `${gpsData.latitude.toFixed(5)}, ${gpsData.longitude.toFixed(5)}` : 'No GPS');

  const speedKmh = gpsData?.speed != null ? Math.round(gpsData.speed * 3.6) : null;
  const timestamp = formatGpsTimestamp(capturedAt);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Full screen image/video preview ── */}
      <View style={styles.previewArea}>
        <Image
          source={{ uri }}
          style={styles.preview}
          contentFit="contain"
          transition={200}
        />

        {/* Dark gradient at bottom for stamp readability */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.bottomGradient}
          pointerEvents="none"
        />

        {/* ── GPS Stamp overlay ── */}
        {gpsData && (
          <View style={styles.stampOverlay} pointerEvents="none">
            <GpsStamp
              gpsData={gpsData}
              geoResult={geoResult}
              isGeoLoading={false}
              capturedAt={capturedAt}
              visible={true}
            />
          </View>
        )}

        {/* ── Top bar: back + type badge ── */}
        <View style={[styles.topBar, { top: insets.top + 8 }]}>
          <TouchableOpacity style={styles.topIconBtn} onPress={handleDiscard}>
            <MaterialIcons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.typeBadge}>
            <MaterialIcons
              name={type === 'video' ? 'videocam' : 'camera-alt'}
              size={14}
              color="#fff"
            />
            <Text style={styles.typeBadgeText}>
              {type === 'video' ? 'VIDEO' : 'PHOTO'} · {resolution}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.topIconBtn}
            onPress={handleShare}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="share" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Meta panel ── */}
      <LinearGradient
        colors={['#0d1b3e', '#1a2a5e']}
        style={[styles.metaPanel, { paddingBottom: insets.bottom + 12 }]}
      >
        {/* Location row */}
        <View style={styles.locationRow}>
          <View style={styles.locDot} />
          <Text style={styles.locationText} numberOfLines={1}>{locationLabel}</Text>
          {geoResult?.countryFlag ? (
            <Text style={styles.flag}>{geoResult.countryFlag}</Text>
          ) : null}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {gpsData && (
            <>
              <View style={styles.statChip}>
                <MaterialIcons name="gps-fixed" size={11} color={Colors.gpsGreen} />
                <Text style={styles.statTxt}>
                  {Math.abs(gpsData.latitude).toFixed(4)}° {gpsData.latitude >= 0 ? 'N' : 'S'}
                </Text>
              </View>
              <View style={styles.statChip}>
                <MaterialIcons name="gps-fixed" size={11} color={Colors.gpsGreen} />
                <Text style={styles.statTxt}>
                  {Math.abs(gpsData.longitude).toFixed(4)}° {gpsData.longitude >= 0 ? 'E' : 'W'}
                </Text>
              </View>
            </>
          )}
          {speedKmh != null && (
            <View style={styles.statChip}>
              <MaterialIcons name="speed" size={11} color={Colors.gpsGreen} />
              <Text style={styles.statTxt}>{speedKmh} km/h</Text>
            </View>
          )}
        </View>

        <Text style={styles.timestampText}>{timestamp}</Text>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          {/* Discard */}
          <TouchableOpacity
            style={styles.discardBtn}
            onPress={handleDiscard}
            activeOpacity={0.8}
          >
            <MaterialIcons name="delete-outline" size={20} color={Colors.recording} />
            <Text style={styles.discardBtnTxt}>Discard</Text>
          </TouchableOpacity>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, saved && styles.saveBtnDone]}
            onPress={handleSave}
            disabled={saving || saved}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : saved ? (
              <>
                <MaterialIcons name="check-circle" size={20} color="#fff" />
                <Text style={styles.saveBtnTxt}>Saved!</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="save-alt" size={20} color="#fff" />
                <Text style={styles.saveBtnTxt}>Save to Gallery</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  // Preview
  previewArea: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  preview: {
    flex: 1,
    width: '100%',
  },
  bottomGradient: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: 180,
  },

  // GPS stamp
  stampOverlay: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
  },

  // Top bar
  topBar: {
    position: 'absolute', left: Spacing.md, right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topIconBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  typeBadgeText: {
    color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.8,
  },

  // Meta panel
  metaPanel: {
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  locDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.gpsGreen,
  },
  locationText: {
    flex: 1, color: '#fff', fontSize: FontSize.sm, fontWeight: '700',
  },
  flag: { fontSize: 18 },

  statsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
  },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 4, paddingHorizontal: 8,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: 'rgba(0,255,136,0.2)',
  },
  statTxt: {
    color: Colors.gpsGreen, fontSize: 10, fontWeight: '700',
    fontFamily: 'monospace' as any,
  },
  timestampText: {
    color: 'rgba(255,255,255,0.55)', fontSize: 10,
    fontFamily: 'monospace' as any,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'center',
    marginTop: Spacing.xs,
  },
  discardBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(232,0,26,0.15)',
    paddingVertical: 14, paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: 'rgba(232,0,26,0.3)',
  },
  discardBtnTxt: {
    color: Colors.recording, fontSize: FontSize.sm, fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.full,
    ...GlassShadow,
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    elevation: 6,
  },
  saveBtnDone: { backgroundColor: Colors.gpsGreen },
  saveBtnTxt: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
});
