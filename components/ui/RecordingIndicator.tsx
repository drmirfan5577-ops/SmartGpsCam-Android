import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, FontSize, Spacing } from '@/constants/theme';

interface Props {
  isRecording: boolean;
  duration: number;
}

const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');

const formatDuration = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

const RecordingIndicator = ({ isRecording, duration }: Props) => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulse.setValue(1);
    }
  }, [isRecording, pulse]);

  if (!isRecording) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dot, { opacity: pulse }]} />
      <Text style={styles.recLabel}>REC</Text>
      <Text style={styles.timer}>{formatDuration(duration)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 105,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.recording,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.recording,
    marginRight: Spacing.xs,
  },
  recLabel: {
    color: Colors.recording,
    fontSize: FontSize.sm,
    fontWeight: '800',
    letterSpacing: 2,
    marginRight: Spacing.sm,
  },
  timer: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontFamily: 'monospace' as any,
    fontWeight: '700',
  },
});

export default RecordingIndicator;
