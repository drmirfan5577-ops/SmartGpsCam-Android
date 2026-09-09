import React, { memo, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import { Colors, Spacing, FontSize } from '@/constants/theme';

interface CompassHUDProps {
  visible: boolean;
  heading?: number | null; // from GPS if available
}

const CARDINAL = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function degToCardinal(deg: number): string {
  const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return CARDINAL[idx];
}

const CompassHUD = memo(({ visible, heading: gpsHeading }: CompassHUDProps) => {
  const [heading, setHeading] = useState<number>(0);
  const rotation = useRef(new Animated.Value(0)).current;
  const lastHeading = useRef(0);

  useEffect(() => {
    if (!visible) return;
    Magnetometer.setUpdateInterval(200);
    const sub = Magnetometer.addListener(({ x, y }) => {
      let angle = Math.atan2(y, x) * (180 / Math.PI);
      angle = ((angle % 360) + 360) % 360;
      // Smooth rotation — find shortest path
      let delta = angle - lastHeading.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      const smooth = lastHeading.current + delta;
      lastHeading.current = smooth;
      setHeading(Math.round(((smooth % 360) + 360) % 360));
      Animated.spring(rotation, {
        toValue: -smooth,
        useNativeDriver: true,
        speed: 20,
        bounciness: 0,
      }).start();
    });
    return () => sub.remove();
  }, [visible]);

  const displayHeading = gpsHeading != null ? Math.round(gpsHeading) : heading;
  const cardinal = degToCardinal(displayHeading);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Compass ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            transform: [
              { rotate: rotation.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] }) },
            ],
          },
        ]}
      >
        {/* Cardinal tick marks */}
        {Array.from({ length: 36 }).map((_, i) => {
          const isCardinal = i % 9 === 0;
          const isHalf = i % 4 === 0 && !isCardinal;
          const angle = (i / 36) * 360;
          return (
            <View
              key={i}
              style={[
                styles.tick,
                {
                  transform: [
                    { rotate: `${angle}deg` },
                    { translateY: -38 },
                  ],
                  height: isCardinal ? 10 : isHalf ? 6 : 4,
                  backgroundColor: isCardinal ? Colors.gpsGreen : 'rgba(0,255,136,0.4)',
                },
              ]}
            />
          );
        })}
        {/* N indicator */}
        <View style={styles.northDot} />
      </Animated.View>

      {/* Center crosshair */}
      <View style={styles.crossH} />
      <View style={styles.crossV} />

      {/* Heading readout */}
      <View style={styles.readout}>
        <Text style={styles.cardinalText}>{cardinal}</Text>
        <Text style={styles.degreeText}>{displayHeading}°</Text>
      </View>
    </View>
  );
});

export default CompassHUD;

const RING_SIZE = 92;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 220,
    left: Spacing.md,
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: RING_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.35)',
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tick: {
    position: 'absolute',
    width: 2,
    borderRadius: 1,
  },
  northDot: {
    position: 'absolute',
    top: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.recording,
    alignSelf: 'center',
  },
  crossH: {
    position: 'absolute',
    width: 14,
    height: 1,
    backgroundColor: 'rgba(0,255,136,0.7)',
  },
  crossV: {
    position: 'absolute',
    height: 14,
    width: 1,
    backgroundColor: 'rgba(0,255,136,0.7)',
  },
  readout: {
    position: 'absolute',
    bottom: 8,
    alignItems: 'center',
    width: '100%',
  },
  cardinalText: {
    color: Colors.gpsGreen,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace' as any,
    letterSpacing: 1,
    lineHeight: 13,
  },
  degreeText: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontFamily: 'monospace' as any,
    lineHeight: 11,
  },
});
