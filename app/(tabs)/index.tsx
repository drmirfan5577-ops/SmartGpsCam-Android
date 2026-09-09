import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useAlert } from '@/template';
import { useLocation } from '@/hooks/useLocation';
import { Colors, Spacing, FontSize, Radius, GlassShadow } from '@/constants/theme';
import { DEFAULT_RESOLUTION, ResolutionKey } from '@/constants/config';
import GpsStamp from '@/components/ui/GpsStamp';
import SpeedHUD from '@/components/ui/SpeedHUD';
import CompassHUD from '@/components/ui/CompassHUD';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'sgc_camera_settings';

export interface CameraSettings {
  resolution: ResolutionKey;
  flash: 'off' | 'on' | 'auto' | 'torch';
  facing: CameraType;
  captureMode: 'photo' | 'video';
  timerSeconds: number;
  nightMode: boolean;
  showGpsStamp: boolean;
  showSpeed: boolean;
  showCompass: boolean;
  showGpsPanel: boolean;
  zoomLevel: number;
  dashcamSegment: number;
  beautyLevel: number;
  exposureOffset: number;
  whiteBalance: 'auto' | 'sunny' | 'cloudy' | 'shadow';
}

export const DEFAULT_SETTINGS: CameraSettings = {
  resolution: DEFAULT_RESOLUTION,
  flash: 'off',
  facing: 'back',
  captureMode: 'photo',
  timerSeconds: 0,
  nightMode: false,
  showGpsStamp: true,
  showSpeed: true,
  showCompass: true,
  showGpsPanel: true,
  zoomLevel: 0,
  dashcamSegment: 5,
  beautyLevel: 0,
  exposureOffset: 0,
  whiteBalance: 'auto',
};

export async function loadSettings(): Promise<CameraSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

export async function saveSettings(s: CameraSettings) {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}

const flashIcons: Record<string, any> = {
  off: 'flash-off',
  on: 'flash-on',
  auto: 'flash-auto',
  torch: 'highlight',
};

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Separate ref to track recording state synchronously (avoid stale closure)
  const isRecordingRef = useRef(false);
  const isBusyRef = useRef(false);

  const [settings, setSettings] = useState<CameraSettings>(DEFAULT_SETTINGS);
  const [isRecording, setIsRecording] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [recordDuration, setRecordDuration] = useState(0);
  const [showZoomSlider, setShowZoomSlider] = useState(false);

  const { gpsData, geoResult, isTracking, formattedLat, formattedLon,
    formattedAlt, formattedSpeed, formattedAccuracy, isGeoLoading } = useLocation();

  // Load settings on mount
  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  // Re-sync settings every time tab is focused
  useFocusEffect(
    useCallback(() => {
      loadSettings().then(setSettings);
      // Reset camera ready state on re-focus to avoid stale ref
      setCameraReady(false);
      setTimeout(() => setCameraReady(true), 500);
    }, [])
  );

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordDuration(0);
      timerRef.current = setInterval(() => setRecordDuration((d) => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordDuration(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const fmtDur = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const startTimerCapture = useCallback((action: () => void) => {
    if (settings.timerSeconds === 0) { action(); return; }
    setCountdown(settings.timerSeconds);
    let remaining = settings.timerSeconds;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setCountdown(0);
        action();
      }
    }, 1000);
  }, [settings.timerSeconds]);

  const buildGpsParams = useCallback(() => {
    const gpsParam = gpsData ? JSON.stringify({
      latitude: gpsData.latitude,
      longitude: gpsData.longitude,
      altitude: gpsData.altitude,
      accuracy: gpsData.accuracy,
      speed: gpsData.speed,
    }) : '';
    const geoParam = geoResult ? JSON.stringify(geoResult) : '';
    return { gpsParam, geoParam };
  }, [gpsData, geoResult]);

  // ── Photo Capture ──────────────────────────────────────────────────────────
  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current || isBusyRef.current || !cameraReady) {
      showAlert('Not Ready', 'Camera is still initializing. Please wait a moment.');
      return;
    }
    isBusyRef.current = true;
    setIsBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.92,
        skipProcessing: false,
      });
      if (!photo || !photo.uri) {
        showAlert('Error', 'Photo capture returned no result.');
        return;
      }
      const { gpsParam, geoParam } = buildGpsParams();
      router.push({
        pathname: '/review',
        params: {
          uri: photo.uri,
          type: 'photo',
          resolution: settings.resolution,
          gps: gpsParam,
          geo: geoParam,
        },
      });
    } catch (err: any) {
      showAlert('Capture Failed', err?.message ?? 'Unknown camera error. Please try again.');
    } finally {
      isBusyRef.current = false;
      setIsBusy(false);
    }
  }, [cameraReady, buildGpsParams, settings.resolution, showAlert, router]);

  const handleTakePhoto = useCallback(() => {
    startTimerCapture(capturePhoto);
  }, [startTimerCapture, capturePhoto]);

  // ── Video Recording ────────────────────────────────────────────────────────
  const handleStartRecording = useCallback(async () => {
    if (!cameraRef.current || isRecordingRef.current || !cameraReady) {
      showAlert('Not Ready', 'Camera is still initializing.');
      return;
    }
    isRecordingRef.current = true;
    setIsRecording(true);

    try {
      // recordAsync() only resolves after stopRecording() is called
      const video = await cameraRef.current.recordAsync({
        maxDuration: settings.dashcamSegment * 60,
      });
      if (video && video.uri) {
        const { gpsParam, geoParam } = buildGpsParams();
        router.push({
          pathname: '/review',
          params: {
            uri: video.uri,
            type: 'video',
            resolution: settings.resolution,
            gps: gpsParam,
            geo: geoParam,
          },
        });
      }
    } catch (err: any) {
      // "Recording was stopped" is a normal stop — not an error
      const msg = err?.message ?? '';
      if (!msg.includes('stopped') && !msg.includes('cancelled') && !msg.includes('Recording')) {
        showAlert('Recording Failed', msg || 'Unknown error. Check permissions and try again.');
      }
    } finally {
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  }, [cameraReady, settings.dashcamSegment, settings.resolution, buildGpsParams, showAlert, router]);

  const handleStopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    try {
      cameraRef.current?.stopRecording();
    } catch {}
  }, []);

  const updateSetting = useCallback(async (patch: Partial<CameraSettings>) => {
    setSettings((prev) => {
      const ns = { ...prev, ...patch };
      saveSettings(ns);
      return ns;
    });
  }, []);

  const speedKmh = gpsData?.speed != null ? gpsData.speed * 3.6 : null;
  const locationLabel = geoResult?.city ||
    (isTracking ? (isGeoLoading ? 'Locating...' : formattedLat) : 'No GPS');

  // ── Permissions ──
  if (!permission?.granted) {
    return (
      <View style={styles.permContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <View style={styles.permCard}>
          <View style={styles.permIcon}>
            <MaterialIcons name="camera-alt" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.permTitle}>Camera Access Required</Text>
          <Text style={styles.permSub}>
            SmartGpsCam needs camera access to capture GPS-stamped photos and videos.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission} activeOpacity={0.85}>
            <MaterialIcons name="lock-open" size={18} color="#fff" />
            <Text style={styles.permBtnText}>Grant Camera Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── CAMERA VIEWFINDER ── */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={settings.facing as CameraType}
        flash={settings.flash as FlashMode}
        mode={settings.captureMode}
        zoom={settings.zoomLevel}
        videoQuality={settings.resolution === 'HD' ? '720p' : '1080p'}
        onCameraReady={() => setCameraReady(true)}
      />

      {/* Night mode green tint */}
      {settings.nightMode && (
        <View style={styles.nightTint} pointerEvents="none" />
      )}

      {/* ── Camera not ready overlay ── */}
      {!cameraReady && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.loadingText}>Initializing camera...</Text>
        </View>
      )}

      {/* ══ TOP STATUS BAR ══ */}
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <View style={styles.topChip}>
          <View style={[styles.gpsDot, isTracking ? styles.gpsDotOn : styles.gpsDotOff]} />
          <Text style={styles.topChipText} numberOfLines={1}>{locationLabel}</Text>
        </View>

        <View style={styles.centerBadges}>
          <View style={styles.resBadge}>
            <MaterialIcons name="hd" size={11} color="#fff" />
            <Text style={styles.resBadgeText}>{settings.resolution}</Text>
          </View>
          {settings.nightMode && (
            <View style={[styles.resBadge, { backgroundColor: 'rgba(0,120,60,0.75)' }]}>
              <MaterialIcons name="brightness-2" size={11} color={Colors.gpsGreen} />
              <Text style={[styles.resBadgeText, { color: Colors.gpsGreen }]}>NIGHT</Text>
            </View>
          )}
        </View>

        {speedKmh != null && settings.showSpeed ? (
          <View style={[styles.topChip, speedKmh > 100 ? styles.topChipWarn : null]}>
            <MaterialIcons name="speed" size={10} color={speedKmh > 100 ? '#fff' : Colors.gpsGreen} />
            <Text style={styles.topChipText}>{Math.round(speedKmh)} <Text style={{ fontSize: 9 }}>km/h</Text></Text>
          </View>
        ) : (
          <View style={{ width: 70 }} />
        )}
      </View>

      {/* ══ COMPASS HUD (left sidebar) ══ */}
      <CompassHUD
        visible={settings.showCompass}
        heading={gpsData?.heading}
      />

      {/* ══ SPEED HUD (right sidebar) ══ */}
      <SpeedHUD
        visible={settings.showSpeed}
        speedKmh={speedKmh}
        heading={gpsData?.heading}
      />

      {/* Zoom toggle button */}
      <TouchableOpacity
        style={[styles.zoomBtn, { top: insets.top + 64 }]}
        onPress={() => setShowZoomSlider((v) => !v)}
        activeOpacity={0.8}
      >
        <MaterialIcons name="zoom-in" size={18} color="#fff" />
        <Text style={styles.zoomBtnLabel}>{Math.round(1 + settings.zoomLevel * 29)}×</Text>
      </TouchableOpacity>

      {/* Vertical zoom slider */}
      {showZoomSlider && (
        <View style={[styles.zoomSliderWrap, { top: insets.top + 120 }]}>
          {[
            { v: 0, l: '1×' }, { v: 0.034, l: '2×' }, { v: 0.138, l: '5×' },
            { v: 0.31, l: '10×' }, { v: 0.655, l: '20×' }, { v: 1.0, l: '30×' },
          ].map((p) => (
            <TouchableOpacity
              key={p.l}
              style={[styles.zoomPreset, Math.abs(settings.zoomLevel - p.v) < 0.02 && styles.zoomPresetOn]}
              onPress={() => updateSetting({ zoomLevel: p.v })}
            >
              <Text style={[styles.zoomPresetTxt, Math.abs(settings.zoomLevel - p.v) < 0.02 && { color: '#fff' }]}>
                {p.l}
              </Text>
            </TouchableOpacity>
          ))}
          <Slider
            style={styles.vertSlider}
            minimumValue={0}
            maximumValue={1}
            step={0.01}
            value={settings.zoomLevel}
            onValueChange={(v) => updateSetting({ zoomLevel: parseFloat(v.toFixed(2)) })}
            minimumTrackTintColor={Colors.primary}
            maximumTrackTintColor="rgba(255,255,255,0.3)"
            thumbTintColor={Colors.primary}
            inverted
          />
        </View>
      )}

      {/* ══ GPS INFO PANEL ══ */}
      {settings.showGpsPanel && gpsData && (
        <View style={[styles.gpsPanel, { top: insets.top + 64 }]} pointerEvents="none">
          <View style={styles.gpsPanelRow}>
            <MaterialIcons name="gps-fixed" size={10} color={Colors.gpsGreen} />
            <Text style={styles.gpsPanelTxt}>{formattedLat}</Text>
          </View>
          <View style={styles.gpsPanelRow}>
            <MaterialIcons name="gps-fixed" size={10} color={Colors.gpsGreen} />
            <Text style={styles.gpsPanelTxt}>{formattedLon}</Text>
          </View>
          <View style={styles.gpsPanelRow}>
            <MaterialIcons name="terrain" size={10} color="rgba(0,255,136,0.6)" />
            <Text style={styles.gpsPanelTxt}>{formattedAlt}</Text>
          </View>
          <View style={styles.gpsPanelRow}>
            <MaterialIcons name="my-location" size={10} color="rgba(0,255,136,0.6)" />
            <Text style={styles.gpsPanelTxt}>{formattedAccuracy}</Text>
          </View>
        </View>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <View style={[styles.recBadge, { top: insets.top + 52 }]}>
          <View style={styles.recDot} />
          <Text style={styles.recText}>REC {fmtDur(recordDuration)}</Text>
        </View>
      )}

      {/* Countdown overlay */}
      {countdown > 0 && (
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownNum}>{countdown}</Text>
          <Text style={styles.countdownSub}>{settings.timerSeconds}s timer</Text>
          <TouchableOpacity
            style={styles.cancelTimerBtn}
            onPress={() => {
              if (countdownRef.current) clearInterval(countdownRef.current);
              setCountdown(0);
            }}
          >
            <Text style={styles.cancelTimerTxt}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ══ LIVE GPS STAMP ══ */}
      {settings.showGpsStamp && (
        <View style={[styles.stampWrap, { bottom: insets.bottom + 190 }]} pointerEvents="none">
          <GpsStamp
            gpsData={gpsData}
            geoResult={geoResult}
            isGeoLoading={isGeoLoading}
            visible={true}
          />
        </View>
      )}

      {/* ══ BOTTOM CONTROLS ══ */}
      <View style={[styles.bottomBar, { bottom: insets.bottom + 10 }]}>
        {/* Mode selector */}
        <View style={styles.modeRow}>
          {(['photo', 'video'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.modePill, settings.captureMode === mode && styles.modePillActive]}
              onPress={() => { if (!isRecording) updateSetting({ captureMode: mode }); }}
            >
              <MaterialIcons
                name={mode === 'photo' ? 'camera-alt' : 'videocam'}
                size={14}
                color={settings.captureMode === mode ? '#fff' : 'rgba(255,255,255,0.6)'}
              />
              <Text style={[styles.modeTxt, settings.captureMode === mode && styles.modeTxtActive]}>
                {mode.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Capture row */}
        <View style={styles.captureRow}>
          {/* Flash quick toggle */}
          <TouchableOpacity
            style={styles.sideCtrl}
            onPress={() => {
              const order: CameraSettings['flash'][] = ['off', 'on', 'auto', 'torch'];
              const next = order[(order.indexOf(settings.flash) + 1) % order.length];
              updateSetting({ flash: next });
            }}
          >
            <MaterialIcons
              name={flashIcons[settings.flash]}
              size={26}
              color={settings.flash !== 'off' ? '#ffdd00' : 'rgba(255,255,255,0.8)'}
            />
            <Text style={styles.sideCtrlLabel}>{settings.flash.toUpperCase()}</Text>
          </TouchableOpacity>

          {/* Center: capture button */}
          {settings.captureMode === 'photo' ? (
            <TouchableOpacity
              style={[
                styles.captureBtn,
                (!cameraReady || isBusy || countdown > 0) && { opacity: 0.4 },
              ]}
              onPress={handleTakePhoto}
              disabled={!cameraReady || isBusy || countdown > 0}
              activeOpacity={0.8}
            >
              {isBusy ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : (
                <View style={styles.captureInner} />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.captureBtn,
                isRecording && styles.captureBtnRec,
                !cameraReady && { opacity: 0.4 },
              ]}
              onPress={isRecording ? handleStopRecording : handleStartRecording}
              disabled={!cameraReady}
              activeOpacity={0.8}
            >
              <View style={[styles.captureInner, isRecording && styles.stopInner]} />
            </TouchableOpacity>
          )}

          {/* Flip camera */}
          <TouchableOpacity
            style={styles.sideCtrl}
            onPress={() => {
              if (isRecording) return;
              updateSetting({ facing: settings.facing === 'back' ? 'front' : 'back' });
            }}
          >
            <MaterialIcons name="flip-camera-android" size={26} color="rgba(255,255,255,0.85)" />
            <Text style={styles.sideCtrlLabel}>{settings.facing.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* Timer badge */}
        {settings.timerSeconds > 0 && (
          <View style={styles.timerBadge}>
            <MaterialIcons name="timer" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.timerBadgeText}>{settings.timerSeconds}s timer active</Text>
          </View>
        )}

        {/* Camera status */}
        {!cameraReady && (
          <View style={styles.timerBadge}>
            <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
            <Text style={styles.timerBadgeText}>Camera initializing...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  permContainer: {
    flex: 1, backgroundColor: Colors.background,
    justifyContent: 'center', alignItems: 'center', padding: Spacing.xl,
  },
  permCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center', width: '100%',
    ...GlassShadow,
  },
  permIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryDim,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg,
  },
  permTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '800', marginBottom: Spacing.sm },
  permSub: {
    color: Colors.textSecondary, fontSize: FontSize.sm,
    textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl,
  },
  permBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl, borderRadius: Radius.full,
  },
  permBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', gap: 12,
  },
  loadingText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '600' },

  topBar: {
    position: 'absolute', left: Spacing.md, right: Spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  topChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.camOverlay,
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: Radius.full,
    maxWidth: 130,
  },
  topChipWarn: { backgroundColor: 'rgba(232,0,26,0.75)' },
  topChipText: { color: '#fff', fontSize: 10, fontWeight: '700', fontFamily: 'monospace' as any },
  gpsDot: { width: 7, height: 7, borderRadius: 3.5 },
  gpsDotOn: { backgroundColor: '#00ff88' },
  gpsDotOff: { backgroundColor: '#ffcc00' },
  centerBadges: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  resBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.camOverlay,
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: Radius.full,
  },
  resBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  gpsPanel: {
    position: 'absolute', left: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: 6, paddingHorizontal: 8,
    borderRadius: Radius.md, gap: 3,
    borderWidth: 1, borderColor: 'rgba(0,255,136,0.2)',
  },
  gpsPanelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gpsPanelTxt: {
    color: Colors.gpsGreen, fontSize: 9,
    fontFamily: 'monospace' as any, fontWeight: '600',
  },

  zoomBtn: {
    position: 'absolute', right: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 46, height: 46, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', gap: 1,
  },
  zoomBtnLabel: { color: '#fff', fontSize: 9, fontWeight: '800', fontFamily: 'monospace' as any },

  zoomSliderWrap: {
    position: 'absolute', right: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: Radius.lg, paddingVertical: Spacing.sm,
    paddingHorizontal: 8, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: 'rgba(0,87,231,0.35)',
    width: 62, maxHeight: 340,
  },
  zoomPreset: {
    paddingVertical: 4, paddingHorizontal: 6,
    borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)',
    minWidth: 42, alignItems: 'center',
  },
  zoomPresetOn: { backgroundColor: Colors.primary },
  zoomPresetTxt: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700' },
  vertSlider: {
    width: 120, height: 28,
    transform: [{ rotate: '270deg' }],
    marginVertical: 24,
  },

  recBadge: {
    position: 'absolute', alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(232,0,26,0.88)',
    paddingVertical: 5, paddingHorizontal: 14, borderRadius: Radius.full,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  recText: { color: '#fff', fontSize: 11, fontWeight: '800', fontFamily: 'monospace' as any },

  nightTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,60,0,0.35)',
  },

  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', gap: Spacing.md,
  },
  countdownNum: {
    color: '#fff', fontSize: 130, fontWeight: '900',
    textShadowColor: Colors.primary, textShadowRadius: 30,
    textShadowOffset: { width: 0, height: 0 },
  },
  countdownSub: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm },
  cancelTimerBtn: {
    backgroundColor: Colors.recording,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
  },
  cancelTimerTxt: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },

  stampWrap: {
    position: 'absolute', left: Spacing.md, right: Spacing.md,
  },

  bottomBar: {
    position: 'absolute', left: 0, right: 0,
    paddingHorizontal: Spacing.lg, gap: Spacing.sm,
  },
  modeRow: {
    flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginBottom: 4,
  },
  modePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 7, paddingHorizontal: Spacing.md, borderRadius: Radius.full,
    backgroundColor: Colors.camOverlay,
  },
  modePillActive: { backgroundColor: Colors.primary },
  modeTxt: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1 },
  modeTxtActive: { color: '#fff' },

  captureRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
  },
  sideCtrl: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', gap: 3 },
  sideCtrlLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },

  captureBtn: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 4, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#fff', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  captureBtnRec: { borderColor: Colors.recording, backgroundColor: 'rgba(232,0,26,0.25)' },
  captureInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' },
  stopInner: { width: 30, height: 30, borderRadius: 6, backgroundColor: Colors.recording },

  timerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    justifyContent: 'center', marginTop: 2,
  },
  timerBadgeText: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' },
});
