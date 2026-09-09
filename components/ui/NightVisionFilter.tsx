import React, { memo, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface NightVisionFilterProps {
  active: boolean;
  intensity?: number; // 0–1, default 0.55
}

/**
 * Night vision green tint overlay with scanline simulation.
 * Pure RN — no native modules required.
 */
const NightVisionFilter = memo(({ active, intensity = 0.55 }: NightVisionFilterProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scanlineY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: active ? 1 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.timing(scanlineY, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [active]);

  if (!active) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: Animated.multiply(fadeAnim, intensity + 0.1) }]} pointerEvents="none">
      {/* Green tint */}
      <View style={styles.greenTint} />
      {/* Vignette */}
      <View style={styles.vignette} />
      {/* Scanlines via repeated thin lines */}
      <View style={styles.scanlines}>
        {Array.from({ length: 60 }).map((_, i) => (
          <View key={i} style={styles.scanline} />
        ))}
      </View>
      {/* Moving scanline sweep */}
      <Animated.View
        style={[
          styles.sweep,
          {
            transform: [
              {
                translateY: scanlineY.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-800, 800],
                }),
              },
            ],
          },
        ]}
      />
    </Animated.View>
  );
});

export default NightVisionFilter;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  greenTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,80,0,0.38)',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 60,
    borderColor: 'rgba(0,20,0,0.7)',
    borderRadius: 4,
  },
  scanlines: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  scanline: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  sweep: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(0,255,80,0.15)',
  },
});
