import React, { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, Spacing, FontSize } from '@/constants/theme';

interface GpsOverlayProps {
  lat: string;
  lon: string;
  alt: string;
  speed: string;
  accuracy: string;
  isTracking: boolean;
  currentTime: string;
  currentDate: string;
  satelliteCount?: number;
  heading?: number | null;
  showCompass?: boolean;
}

const GpsOverlay = memo(
  ({
    lat,
    lon,
    alt,
    speed,
    accuracy,
    isTracking,
    currentTime,
    currentDate,
    satelliteCount,
    heading,
  }: GpsOverlayProps) => {
    const blinkAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      if (!isTracking) {
        const blink = Animated.loop(
          Animated.sequence([
            Animated.timing(blinkAnim, { toValue: 0.2, duration: 600, useNativeDriver: true }),
            Animated.timing(blinkAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          ])
        );
        blink.start();
        return () => blink.stop();
      } else {
        blinkAnim.setValue(1);
      }
    }, [isTracking]);

    return (
      <View style={styles.container} pointerEvents="none">
        {/* Top-left: GPS coords panel */}
        <View style={styles.panel}>
          <View style={styles.statusRow}>
            <Animated.View
              style={[
                styles.dot,
                isTracking ? styles.dotActive : styles.dotInactive,
                { opacity: isTracking ? 1 : blinkAnim },
              ]}
            />
            <Text style={[styles.statusLabel, !isTracking && { color: Colors.warning }]}>
              {isTracking ? 'GPS LOCK' : 'SEARCHING...'}
            </Text>
            {isTracking && satelliteCount != null && (
              <View style={styles.satBadge}>
                <Text style={styles.satText}>SAT {satelliteCount}</Text>
              </View>
            )}
          </View>

          <View style={styles.coordGrid}>
            <CoordRow label="LAT" value={lat} />
            <CoordRow label="LON" value={lon} />
            <CoordRow label="ALT" value={alt} />
            <CoordRow label="SPD" value={speed} highlight />
            <CoordRow label="ACC" value={accuracy} />
            {heading != null && (
              <CoordRow label="HDG" value={`${Math.round(heading)}°`} />
            )}
          </View>
        </View>

        {/* Top-right: timestamp panel */}
        <View style={styles.timePanel}>
          <Text style={styles.timeText}>{currentTime}</Text>
          <Text style={styles.dateText}>{currentDate}</Text>
          {isTracking && (
            <View style={styles.gpsLockRow}>
              <View style={styles.lockDot} />
              <Text style={styles.lockText}>LOCKED</Text>
            </View>
          )}
        </View>

        {/* Corner HUD brackets */}
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />

        {/* Center crosshair (subtle) */}
        <View style={styles.centerH} />
        <View style={styles.centerV} />
      </View>
    );
  }
);

const CoordRow = memo(
  ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
    <View style={styles.coordRow}>
      <Text style={styles.coordLabel}>{label}</Text>
      <Text style={[styles.coordValue, highlight && styles.coordValueHighlight]}>{value}</Text>
    </View>
  )
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none' as any,
  },
  panel: {
    position: 'absolute',
    top: Spacing.xl,
    left: Spacing.md,
    backgroundColor: Colors.hudOverlay,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.35)',
    minWidth: 215,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotActive: { backgroundColor: Colors.gpsGreen },
  dotInactive: { backgroundColor: Colors.warning },
  statusLabel: {
    color: Colors.gpsGreen,
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
    flex: 1,
  },
  satBadge: {
    backgroundColor: 'rgba(0,255,136,0.15)',
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.3)',
  },
  satText: {
    color: Colors.gpsGreen,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  coordGrid: { gap: 1 },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coordLabel: {
    color: 'rgba(0,255,136,0.55)',
    fontSize: FontSize.xs,
    fontFamily: 'monospace' as any,
    width: 28,
  },
  coordValue: {
    color: Colors.gpsGreen,
    fontSize: FontSize.xs,
    fontFamily: 'monospace' as any,
    letterSpacing: 0.5,
    lineHeight: 18,
  },
  coordValueHighlight: {
    color: '#ffcc00',
    fontWeight: '700',
  },
  timePanel: {
    position: 'absolute',
    top: Spacing.xl,
    right: Spacing.md,
    backgroundColor: Colors.hudOverlay,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.35)',
    alignItems: 'flex-end',
  },
  timeText: {
    color: Colors.gpsGreen,
    fontSize: FontSize.lg,
    fontFamily: 'monospace' as any,
    fontWeight: '700',
    letterSpacing: 2,
  },
  dateText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontFamily: 'monospace' as any,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  gpsLockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  lockDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.gpsGreen,
  },
  lockText: {
    color: Colors.gpsGreen,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
  },
  // Corner brackets
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: 'rgba(0,255,136,0.55)',
  },
  cornerTL: { top: 48, left: 8, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: 48, right: 8, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: 158, left: 8, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: 158, right: 8, borderBottomWidth: 2, borderRightWidth: 2 },
  // Center crosshair
  centerH: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -12,
    marginTop: -0.5,
    width: 24,
    height: 1,
    backgroundColor: 'rgba(0,255,136,0.4)',
  },
  centerV: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -0.5,
    marginTop: -12,
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0,255,136,0.4)',
  },
});

export default GpsOverlay;
