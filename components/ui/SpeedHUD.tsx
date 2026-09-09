import React, { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize } from '@/constants/theme';

interface SpeedHUDProps {
  speedKmh: number | null;
  heading: number | null;
  visible: boolean;
  warningThreshold?: number; // km/h — default 100
}

function getSpeedColor(kmh: number): string {
  if (kmh < 60) return Colors.gpsGreen;
  if (kmh < 90) return '#ffcc00';
  if (kmh < 120) return '#ff8800';
  return Colors.recording;
}

function getSpeedLabel(kmh: number): string {
  if (kmh < 30) return 'SLOW';
  if (kmh < 60) return 'NORMAL';
  if (kmh < 90) return 'FAST';
  if (kmh < 120) return 'HIGH';
  return 'ALERT';
}

const SpeedHUD = memo(({ speedKmh, heading, visible, warningThreshold = 100 }: SpeedHUDProps) => {
  const flashAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevSpeed = useRef<number | null>(null);

  const kmh = speedKmh != null ? Math.round(speedKmh) : null;
  const isAlert = kmh != null && kmh >= warningThreshold;

  useEffect(() => {
    if (!visible) return;
    if (isAlert) {
      const flash = Animated.loop(
        Animated.sequence([
          Animated.timing(flashAnim, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.timing(flashAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ])
      );
      flash.start();
      return () => flash.stop();
    } else {
      flashAnim.setValue(1);
    }
  }, [isAlert, visible]);

  useEffect(() => {
    if (kmh != null && prevSpeed.current != null && Math.abs(kmh - prevSpeed.current) > 10) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.15, duration: 120, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    }
    prevSpeed.current = kmh;
  }, [kmh]);

  if (!visible) return null;

  const color = kmh != null ? getSpeedColor(kmh) : Colors.textMuted;

  return (
    <Animated.View style={[styles.container, { opacity: flashAnim }]} pointerEvents="none">
      {/* Speed arc ring */}
      <View style={[styles.ring, { borderColor: isAlert ? Colors.recording : 'rgba(0,255,136,0.3)' }]}>
        <Animated.Text style={[styles.speedValue, { color, transform: [{ scale: scaleAnim }] }]}>
          {kmh != null ? String(kmh).padStart(3, '0') : '---'}
        </Animated.Text>
        <Text style={[styles.speedUnit, { color: Colors.textSecondary }]}>km/h</Text>
        {kmh != null && (
          <Text style={[styles.speedLabel, { color }]}>{getSpeedLabel(kmh)}</Text>
        )}
      </View>

      {/* Heading compass bar */}
      {heading != null && (
        <View style={styles.headingBar}>
          <MaterialIcons name="navigation" size={10} color={Colors.gpsGreen} style={{ transform: [{ rotate: `${heading}deg` }] }} />
          <Text style={styles.headingText}>{Math.round(heading)}°</Text>
        </View>
      )}

      {/* Alert badge */}
      {isAlert && (
        <View style={styles.alertBadge}>
          <MaterialIcons name="warning" size={10} color={Colors.recording} />
          <Text style={styles.alertText}>SPEED</Text>
        </View>
      )}
    </Animated.View>
  );
});

export default SpeedHUD;

const RING = 84;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 220,
    right: Spacing.md + 52,
    alignItems: 'center',
  },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedValue: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'monospace' as any,
    letterSpacing: 1,
    lineHeight: 26,
  },
  speedUnit: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    lineHeight: 10,
  },
  speedLabel: {
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1.5,
    lineHeight: 10,
  },
  headingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.25)',
  },
  headingText: {
    color: Colors.gpsGreen,
    fontSize: 9,
    fontFamily: 'monospace' as any,
    fontWeight: '700',
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,45,45,0.2)',
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.recording,
    marginTop: 4,
  },
  alertText: {
    color: Colors.recording,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
