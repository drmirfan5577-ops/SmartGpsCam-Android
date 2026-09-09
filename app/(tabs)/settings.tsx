/**
 * SETTINGS TAB — Full sidebar-style settings with all camera controls,
 * GPS, HUD, display, dashcam, beauty & quality features.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Radius, GlassShadow } from '@/constants/theme';
import {
  CameraSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from './index';
import { RESOLUTIONS, ResolutionKey } from '@/constants/config';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { exportGpxFile, GpxPoint } from '@/services/gpxExport';
import { useAlert } from '@/template';

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, title }: { icon: any; title: string }) {
  return (
    <View style={sStyles.sectionHeader}>
      <View style={sStyles.sectionIconWrap}>
        <MaterialIcons name={icon} size={16} color={Colors.primary} />
      </View>
      <Text style={sStyles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ── Setting row ───────────────────────────────────────────────────────────────
function SettingRow({
  icon,
  label,
  sub,
  right,
  onPress,
  active,
}: {
  icon: any;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  active?: boolean;
}) {
  const Inner = (
    <View style={[sStyles.row, active && sStyles.rowActive]}>
      <View style={[sStyles.rowIcon, active && sStyles.rowIconActive]}>
        <MaterialIcons name={icon} size={18} color={active ? Colors.primary : Colors.textSecondary} />
      </View>
      <View style={sStyles.rowText}>
        <Text style={sStyles.rowLabel}>{label}</Text>
        {sub ? <Text style={sStyles.rowSub}>{sub}</Text> : null}
      </View>
      <View style={sStyles.rowRight}>{right}</View>
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.75}>{Inner}</TouchableOpacity>;
  return Inner;
}

// ── Chip selector ─────────────────────────────────────────────────────────────
function ChipSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  color = Colors.primary,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  color?: string;
}) {
  return (
    <View style={sStyles.chipRow}>
      <Text style={sStyles.chipLabel}>{label}</Text>
      <View style={sStyles.chips}>
        {options.map((o) => (
          <TouchableOpacity
            key={o.value}
            style={[sStyles.chip, value === o.value && { backgroundColor: color, borderColor: color }]}
            onPress={() => onChange(o.value)}
            activeOpacity={0.75}
          >
            <Text style={[sStyles.chipTxt, value === o.value && { color: '#fff' }]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { mediaItems, loadRecentMedia } = useMediaLibrary();

  const [s, setS] = useState<CameraSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadSettings().then((v) => { setS(v); setLoading(false); });
  }, []);

  const update = useCallback(async (patch: Partial<CameraSettings>) => {
    const ns = { ...s, ...patch };
    setS(ns);
    await saveSettings(ns);
  }, [s]);

  const resetAll = useCallback(async () => {
    setS(DEFAULT_SETTINGS);
    await saveSettings(DEFAULT_SETTINGS);
    showAlert('Reset', 'All settings restored to defaults.');
  }, [showAlert]);

  const handleExportGpx = useCallback(async () => {
    await loadRecentMedia();
    const pts = mediaItems.filter((m) => m.gps != null);
    if (pts.length === 0) {
      showAlert('No GPS Data', 'Capture media with GPS active first.');
      return;
    }
    setExporting(true);
    try {
      const gpxPts: GpxPoint[] = pts.map((m) => ({
        latitude: m.gps!.latitude,
        longitude: m.gps!.longitude,
        altitude: m.gps?.altitude,
        accuracy: m.gps?.accuracy,
        speed: m.gps?.speed,
        timestamp: m.createdAt,
        name: m.filename,
        type: m.type,
      }));
      const res = await exportGpxFile(gpxPts);
      if (!res.success) showAlert('Export Failed', res.error ?? 'Unknown error.');
    } finally {
      setExporting(false);
    }
  }, [mediaItems, loadRecentMedia, showAlert]);

  if (loading) {
    return (
      <View style={[sStyles.container, { paddingTop: insets.top + 20 }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[sStyles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={sStyles.header}>
        <View>
          <Text style={sStyles.headerTitle}>SETTINGS</Text>
          <Text style={sStyles.headerSub}>SmartGpsCam Controls</Text>
        </View>
        <TouchableOpacity style={sStyles.resetBtn} onPress={resetAll} activeOpacity={0.8}>
          <MaterialIcons name="refresh" size={16} color={Colors.warning} />
          <Text style={sStyles.resetTxt}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={sStyles.scroll}
      >
        {/* ════════════════════════════════════════════
            1. CAMERA CONTROLS
        ════════════════════════════════════════════ */}
        <View style={sStyles.card}>
          <SectionHeader icon="camera-alt" title="Camera Controls" />

          {/* Front / Back toggle */}
          <SettingRow
            icon="flip-camera-android"
            label="Camera Lens"
            sub={s.facing === 'back' ? 'Rear Camera Active' : 'Front Camera Active'}
            active={s.facing === 'front'}
            right={
              <View style={sStyles.togglePill}>
                <TouchableOpacity
                  style={[sStyles.toggleOpt, s.facing === 'back' && sStyles.toggleOptActive]}
                  onPress={() => update({ facing: 'back' })}
                >
                  <MaterialIcons name="camera-rear" size={14} color={s.facing === 'back' ? '#fff' : Colors.textMuted} />
                  <Text style={[sStyles.toggleTxt, s.facing === 'back' && { color: '#fff' }]}>BACK</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[sStyles.toggleOpt, s.facing === 'front' && sStyles.toggleOptActive]}
                  onPress={() => update({ facing: 'front' })}
                >
                  <MaterialIcons name="camera-front" size={14} color={s.facing === 'front' ? '#fff' : Colors.textMuted} />
                  <Text style={[sStyles.toggleTxt, s.facing === 'front' && { color: '#fff' }]}>FRONT</Text>
                </TouchableOpacity>
              </View>
            }
          />

          {/* Flash */}
          <ChipSelect
            label="Flash Mode"
            options={[
              { value: 'off', label: '✕ Off' },
              { value: 'on', label: '⚡ On' },
              { value: 'auto', label: '⚙ Auto' },
              { value: 'torch', label: '🔦 Torch' },
            ]}
            value={s.flash}
            onChange={(v) => update({ flash: v as CameraSettings['flash'] })}
          />

          {/* Resolution */}
          <View style={sStyles.chipRow}>
            <Text style={sStyles.chipLabel}>Resolution</Text>
            <View style={sStyles.resList}>
              {(Object.keys(RESOLUTIONS) as ResolutionKey[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[sStyles.resChip, s.resolution === r && sStyles.resChipActive]}
                  onPress={() => update({ resolution: r })}
                  activeOpacity={0.75}
                >
                  <Text style={[sStyles.resChipTitle, s.resolution === r && { color: '#fff' }]}>{r}</Text>
                  <Text style={[sStyles.resChipSub, s.resolution === r && { color: 'rgba(255,255,255,0.7)' }]}>
                    {RESOLUTIONS[r].width}×{RESOLUTIONS[r].height}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Capture mode */}
          <ChipSelect
            label="Capture Mode"
            options={[{ value: 'photo', label: '📷 Photo' }, { value: 'video', label: '🎬 Video' }]}
            value={s.captureMode}
            onChange={(v) => update({ captureMode: v as 'photo' | 'video' })}
          />

          {/* Timer */}
          <ChipSelect
            label="Capture Timer"
            options={[
              { value: '0', label: 'Off' },
              { value: '3', label: '3s' },
              { value: '5', label: '5s' },
              { value: '10', label: '10s' },
            ]}
            value={String(s.timerSeconds)}
            onChange={(v) => update({ timerSeconds: Number(v) })}
            color="#8b5cf6"
          />

          {/* White balance */}
          <ChipSelect
            label="White Balance"
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'sunny', label: '☀ Sunny' },
              { value: 'cloudy', label: '☁ Cloudy' },
              { value: 'shadow', label: '🌑 Shadow' },
            ]}
            value={s.whiteBalance}
            onChange={(v) => update({ whiteBalance: v as CameraSettings['whiteBalance'] })}
            color="#f59e0b"
          />
        </View>

        {/* ════════════════════════════════════════════
            2. ZOOM & EXPOSURE
        ════════════════════════════════════════════ */}
        <View style={sStyles.card}>
          <SectionHeader icon="zoom-in" title="Zoom & Exposure" />

          <View style={sStyles.sliderBlock}>
            <View style={sStyles.sliderHeader}>
              <Text style={sStyles.sliderLabel}>Zoom Level</Text>
              <Text style={sStyles.sliderValue}>{Math.round(1 + s.zoomLevel * 29)}×</Text>
            </View>
            <View style={sStyles.zoomPresets}>
              {[0, 0.034, 0.138, 0.31, 0.655, 1.0].map((v, i) => {
                const labels = ['1×', '2×', '5×', '10×', '20×', '30×'];
                return (
                  <TouchableOpacity
                    key={v}
                    style={[sStyles.zoomPreset, Math.abs(s.zoomLevel - v) < 0.02 && sStyles.zoomPresetActive]}
                    onPress={() => update({ zoomLevel: v })}
                  >
                    <Text style={[sStyles.zoomPresetTxt, Math.abs(s.zoomLevel - v) < 0.02 && { color: '#fff' }]}>
                      {labels[i]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Slider
              style={sStyles.slider}
              minimumValue={0}
              maximumValue={1}
              step={0.01}
              value={s.zoomLevel}
              onValueChange={(v) => update({ zoomLevel: parseFloat(v.toFixed(2)) })}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.surfaceBorder}
              thumbTintColor={Colors.primary}
            />
          </View>

          <View style={sStyles.sliderBlock}>
            <View style={sStyles.sliderHeader}>
              <Text style={sStyles.sliderLabel}>Exposure</Text>
              <Text style={sStyles.sliderValue}>{s.exposureOffset > 0 ? '+' : ''}{s.exposureOffset.toFixed(1)} EV</Text>
            </View>
            <Slider
              style={sStyles.slider}
              minimumValue={-1}
              maximumValue={1}
              step={0.1}
              value={s.exposureOffset}
              onValueChange={(v) => update({ exposureOffset: parseFloat(v.toFixed(1)) })}
              minimumTrackTintColor={Colors.warning}
              maximumTrackTintColor={Colors.surfaceBorder}
              thumbTintColor={Colors.warning}
            />
          </View>
        </View>

        {/* ════════════════════════════════════════════
            3. DISPLAY / DAY-NIGHT MODE
        ════════════════════════════════════════════ */}
        <View style={sStyles.card}>
          <SectionHeader icon="brightness-6" title="Display & Vision" />

          <SettingRow
            icon={s.nightMode ? 'brightness-2' : 'brightness-7'}
            label="Night Vision Mode"
            sub={s.nightMode ? 'Green tint filter active — low light' : 'Normal daylight mode'}
            active={s.nightMode}
            right={
              <Switch
                value={s.nightMode}
                onValueChange={(v) => update({ nightMode: v })}
                trackColor={{ false: Colors.surfaceBorder, true: 'rgba(0,184,108,0.4)' }}
                thumbColor={s.nightMode ? Colors.gpsGreen : Colors.textMuted}
              />
            }
          />

          <View style={sStyles.sliderBlock}>
            <View style={sStyles.sliderHeader}>
              <Text style={sStyles.sliderLabel}>Beauty Enhancement Level</Text>
              <Text style={sStyles.sliderValue}>{s.beautyLevel}%</Text>
            </View>
            <View style={sStyles.beautyBar}>
              {['Off', 'Light', 'Medium', 'High', 'Max'].map((lbl, i) => (
                <TouchableOpacity
                  key={lbl}
                  style={[sStyles.beautyOpt, s.beautyLevel === i * 25 && sStyles.beautyOptActive]}
                  onPress={() => update({ beautyLevel: i * 25 })}
                >
                  <Text style={[sStyles.beautyOptTxt, s.beautyLevel === i * 25 && { color: '#fff' }]}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Slider
              style={sStyles.slider}
              minimumValue={0}
              maximumValue={100}
              step={1}
              value={s.beautyLevel}
              onValueChange={(v) => update({ beautyLevel: Math.round(v) })}
              minimumTrackTintColor="#ec4899"
              maximumTrackTintColor={Colors.surfaceBorder}
              thumbTintColor="#ec4899"
            />
          </View>
        </View>

        {/* ════════════════════════════════════════════
            4. GPS / HUD OVERLAYS
        ════════════════════════════════════════════ */}
        <View style={sStyles.card}>
          <SectionHeader icon="gps-fixed" title="GPS & HUD Overlays" />

          <SettingRow
            icon="place"
            label="GPS Stamp on Camera"
            sub="Show real-time location, address & timestamp"
            active={s.showGpsStamp}
            right={
              <Switch
                value={s.showGpsStamp}
                onValueChange={(v) => update({ showGpsStamp: v })}
                trackColor={{ false: Colors.surfaceBorder, true: 'rgba(0,184,108,0.4)' }}
                thumbColor={s.showGpsStamp ? Colors.gpsGreen : Colors.textMuted}
              />
            }
          />
          <SettingRow
            icon="gps-not-fixed"
            label="GPS Info Panel"
            sub="Lat / Long / Alt / Accuracy display"
            active={s.showGpsPanel}
            right={
              <Switch
                value={s.showGpsPanel}
                onValueChange={(v) => update({ showGpsPanel: v })}
                trackColor={{ false: Colors.surfaceBorder, true: 'rgba(0,184,108,0.4)' }}
                thumbColor={s.showGpsPanel ? Colors.gpsGreen : Colors.textMuted}
              />
            }
          />
          <SettingRow
            icon="speed"
            label="Speed HUD"
            sub="Live km/h display with warning alert"
            active={s.showSpeed}
            right={
              <Switch
                value={s.showSpeed}
                onValueChange={(v) => update({ showSpeed: v })}
                trackColor={{ false: Colors.surfaceBorder, true: 'rgba(0,184,108,0.4)' }}
                thumbColor={s.showSpeed ? Colors.gpsGreen : Colors.textMuted}
              />
            }
          />
          <SettingRow
            icon="explore"
            label="Compass HUD"
            sub="Magnetometer-based heading indicator"
            active={s.showCompass}
            right={
              <Switch
                value={s.showCompass}
                onValueChange={(v) => update({ showCompass: v })}
                trackColor={{ false: Colors.surfaceBorder, true: 'rgba(0,184,108,0.4)' }}
                thumbColor={s.showCompass ? Colors.gpsGreen : Colors.textMuted}
              />
            }
          />

          {/* Open device location settings */}
          <SettingRow
            icon="my-location"
            label="Open Device Location Settings"
            sub="Ensure GPS is enabled on your device"
            onPress={() => Linking.openSettings()}
            right={<MaterialIcons name="open-in-new" size={16} color={Colors.textMuted} />}
          />
        </View>

        {/* ════════════════════════════════════════════
            5. DASHCAM LOOP
        ════════════════════════════════════════════ */}
        <View style={sStyles.card}>
          <SectionHeader icon="loop" title="Dashcam Loop Recording" />

          <ChipSelect
            label="Segment Duration"
            options={[
              { value: '1', label: '1 min' },
              { value: '5', label: '5 min' },
              { value: '10', label: '10 min' },
              { value: '15', label: '15 min' },
              { value: '30', label: '30 min' },
            ]}
            value={String(s.dashcamSegment)}
            onChange={(v) => update({ dashcamSegment: Number(v) })}
            color={Colors.recording}
          />

          <View style={sStyles.infoBox}>
            <MaterialIcons name="info-outline" size={14} color={Colors.primary} />
            <Text style={sStyles.infoText}>
              Loop mode records continuously in fixed segments. Oldest segment is overwritten when storage is full. Start from the Camera tab.
            </Text>
          </View>
        </View>

        {/* ════════════════════════════════════════════
            6. EXPORT & SHARE
        ════════════════════════════════════════════ */}
        <View style={sStyles.card}>
          <SectionHeader icon="file-download" title="Export & Share" />

          <SettingRow
            icon="map"
            label="Export GPX Track File"
            sub={`Export all ${mediaItems.filter((m) => m.gps).length} GPS-tagged captures as .gpx`}
            onPress={handleExportGpx}
            right={
              exporting
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
            }
          />

          <View style={sStyles.infoBox}>
            <MaterialIcons name="info-outline" size={14} color={Colors.gpsGreen} />
            <Text style={sStyles.infoText}>
              GPX files contain waypoints with precise lat/lng, altitude, speed, and timestamps. Compatible with Google Earth, Maps.me, Garmin, and other GPS tools.
            </Text>
          </View>
        </View>

        {/* ════════════════════════════════════════════
            7. ABOUT
        ════════════════════════════════════════════ */}
        <View style={sStyles.card}>
          <SectionHeader icon="info" title="About SmartGpsCam" />

          <View style={sStyles.aboutBlock}>
            <View style={sStyles.aboutLogo}>
              <MaterialIcons name="gps-fixed" size={30} color={Colors.primary} />
            </View>
            <Text style={sStyles.aboutName}>SmartGpsCam</Text>
            <Text style={sStyles.aboutVersion}>Version 2.0 · Professional GPS Camera</Text>
            <Text style={sStyles.aboutDesc}>
              Real-time GPS stamping · OpenStreetMap Geocoding · Dashcam Loop Recording · GPX Export · Night Vision · Compass HUD · Multi-resolution capture
            </Text>
          </View>

          <SettingRow
            icon="restore"
            label="Reset All Settings"
            sub="Restore all settings to factory defaults"
            onPress={resetAll}
            right={<MaterialIcons name="chevron-right" size={20} color={Colors.warning} />}
          />
        </View>

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const sStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    ...GlassShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  headerSub: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
    letterSpacing: 0.8,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(232,144,10,0.1)',
    paddingVertical: 7,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(232,144,10,0.3)',
  },
  resetTxt: { color: Colors.warning, fontSize: FontSize.xs, fontWeight: '700' },

  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: Spacing.sm },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...GlassShadow,
    gap: 0,
    overflow: 'hidden',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    marginBottom: Spacing.xs,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primaryDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    minHeight: 58,
  },
  rowActive: { backgroundColor: Colors.primaryDim },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  rowIconActive: {
    backgroundColor: Colors.primaryDim,
    borderColor: 'rgba(0,87,231,0.3)',
  },
  rowText: { flex: 1 },
  rowLabel: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  rowSub: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
    lineHeight: 15,
  },
  rowRight: { alignItems: 'flex-end' },

  // Toggle pill
  togglePill: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  toggleOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  toggleOptActive: { backgroundColor: Colors.primary },
  toggleTxt: { color: Colors.textMuted, fontSize: 10, fontWeight: '700' },

  // Chip select
  chipRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },
  chipLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingLeft: 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  chipTxt: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600' },

  // Resolution grid
  resList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  resChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    minWidth: 72,
  },
  resChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  resChipTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  resChipSub: {
    color: Colors.textMuted,
    fontSize: 9,
    marginTop: 2,
  },

  // Sliders
  sliderBlock: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    gap: Spacing.xs,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700' },
  sliderValue: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '800' },
  slider: { width: '100%', height: 36, marginTop: -4 },

  zoomPresets: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: 4,
  },
  zoomPreset: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  zoomPresetActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  zoomPresetTxt: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700' },

  // Beauty
  beautyBar: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  beautyOpt: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  beautyOptActive: { backgroundColor: '#ec4899', borderColor: '#ec4899' },
  beautyOptTxt: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600' },

  // Info box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.primaryDim,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,87,231,0.12)',
  },
  infoText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    lineHeight: 17,
  },

  // About
  aboutBlock: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    gap: Spacing.xs,
  },
  aboutLogo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primaryDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,87,231,0.2)',
  },
  aboutName: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '900', letterSpacing: 1.5 },
  aboutVersion: { color: Colors.textMuted, fontSize: FontSize.xs, letterSpacing: 1 },
  aboutDesc: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
});
