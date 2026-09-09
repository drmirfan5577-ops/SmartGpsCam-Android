import React, { memo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/theme';

interface ZoomSliderProps {
  zoom: number; // 0–1 (device full range)
  onChange: (zoom: number) => void;
  minZoom?: number;
  maxZoom?: number;
}

const TRACK_HEIGHT = 200;
const THUMB_SIZE = 40;

// Zoom presets (mapped to 0-1 range with display labels)
const PRESETS: { label: string; value: number }[] = [
  { label: '1×', value: 0 },
  { label: '2×', value: 0.12 },
  { label: '5×', value: 0.28 },
  { label: '10×', value: 0.5 },
  { label: '20×', value: 0.75 },
  { label: '30×', value: 1.0 },
];

function zoomToDisplay(z: number): string {
  // Map 0-1 to 1x-30x display
  const x = 1 + z * 29;
  if (x < 2) return `${x.toFixed(1)}×`;
  return `${Math.round(x)}×`;
}

const ZoomSlider = memo(({ zoom, onChange, minZoom = 0, maxZoom = 1 }: ZoomSliderProps) => {
  const range = maxZoom - minZoom;
  const ratio = range > 0 ? (zoom - minZoom) / range : 0;
  const [activePreset, setActivePreset] = useState<number | null>(null);

  const thumbPos = useRef(new Animated.Value((1 - ratio) * TRACK_HEIGHT)).current;
  const currentZoomRef = useRef(zoom);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        (thumbPos as any).setOffset((thumbPos as any)._value);
        thumbPos.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        const raw = (thumbPos as any)._offset + gs.dy;
        const clamped = Math.max(0, Math.min(TRACK_HEIGHT, raw));
        thumbPos.setValue(clamped - (thumbPos as any)._offset);
        const newRatio = 1 - clamped / TRACK_HEIGHT;
        const newZoom = minZoom + newRatio * range;
        currentZoomRef.current = Math.max(minZoom, Math.min(maxZoom, newZoom));
        setActivePreset(null);
        onChange(currentZoomRef.current);
      },
      onPanResponderRelease: () => {
        (thumbPos as any).flattenOffset();
      },
    })
  ).current;

  const applyPreset = (value: number, idx: number) => {
    setActivePreset(idx);
    currentZoomRef.current = value;
    const newPos = (1 - (value - minZoom) / range) * TRACK_HEIGHT;
    Animated.spring(thumbPos, {
      toValue: newPos,
      useNativeDriver: false,
      speed: 25,
      bounciness: 3,
    }).start();
    onChange(value);
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {/* Zoom preset buttons */}
      <View style={styles.presets}>
        {PRESETS.map((p, i) => (
          <TouchableOpacity
            key={p.label}
            style={[styles.presetBtn, activePreset === i && styles.presetBtnActive]}
            onPress={() => applyPreset(p.value, i)}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={[styles.presetLabel, activePreset === i && styles.presetLabelActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Vertical slider */}
      <View style={styles.sliderContainer}>
        <MaterialIcons name="zoom-in" size={14} color={Colors.gpsGreen} />
        <View style={styles.track}>
          {/* Filled portion */}
          <Animated.View
            style={[
              styles.trackFill,
              {
                height: Animated.subtract(TRACK_HEIGHT, thumbPos),
                top: thumbPos,
              },
            ]}
          />
          <View style={styles.trackLine} />
          {/* Tick marks */}
          {PRESETS.map((p) => {
            const pos = (1 - (p.value - minZoom) / range) * TRACK_HEIGHT;
            return (
              <View
                key={p.label}
                style={[styles.tick, { top: pos }]}
              />
            );
          })}
          {/* Thumb */}
          <Animated.View
            style={[
              styles.thumb,
              { top: Animated.subtract(thumbPos, THUMB_SIZE / 2) },
            ]}
            {...panResponder.panHandlers}
          >
            <Text style={styles.zoomLabel}>{zoomToDisplay(currentZoomRef.current)}</Text>
          </Animated.View>
        </View>
        <MaterialIcons name="zoom-out" size={14} color={Colors.textMuted} />
      </View>
    </View>
  );
});

export default ZoomSlider;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: Spacing.md,
    top: '20%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  presets: {
    flexDirection: 'column',
    gap: 4,
    alignItems: 'flex-end',
  },
  presetBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.2)',
  },
  presetBtnActive: {
    backgroundColor: 'rgba(0,255,136,0.2)',
    borderColor: Colors.gpsGreen,
  },
  presetLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'monospace' as any,
  },
  presetLabelActive: { color: Colors.gpsGreen },
  sliderContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 24,
    paddingHorizontal: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.25)',
  },
  track: {
    width: THUMB_SIZE,
    height: TRACK_HEIGHT,
    justifyContent: 'flex-start',
    alignItems: 'center',
    position: 'relative',
  },
  trackLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 2,
    backgroundColor: 'rgba(0,255,136,0.18)',
    borderRadius: 2,
    marginLeft: -1,
  },
  trackFill: {
    position: 'absolute',
    left: '50%',
    width: 2,
    marginLeft: -1,
    backgroundColor: Colors.gpsGreen,
    borderRadius: 2,
  },
  tick: {
    position: 'absolute',
    left: 4,
    width: 8,
    height: 1,
    backgroundColor: 'rgba(0,255,136,0.45)',
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderWidth: 2,
    borderColor: Colors.gpsGreen,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: Colors.gpsGreen,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  zoomLabel: {
    color: Colors.gpsGreen,
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'monospace' as any,
  },
});
