import React, { memo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { SegmentDuration } from '@/hooks/useDashcamLoop';

interface Props {
  visible: boolean;
  segmentDuration: SegmentDuration;
  onSelectDuration: (d: SegmentDuration) => void;
  onStart: () => void;
  onClose: () => void;
}

const DURATIONS: { value: SegmentDuration; label: string; sub: string }[] = [
  { value: 1, label: '1 min', sub: 'Short clips, more segments' },
  { value: 5, label: '5 min', sub: 'Balanced — recommended' },
  { value: 10, label: '10 min', sub: 'Longer clips, fewer files' },
];

const DashcamModal = memo(({ visible, segmentDuration, onSelectDuration, onStart, onClose }: Props) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <MaterialIcons name="loop" size={22} color={Colors.recording} />
            <Text style={styles.title}>Dashcam Loop Mode</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          Records in segments and overwrites the oldest clips automatically. Keeps the last 6 segments.
        </Text>

        <Text style={styles.sectionLabel}>SEGMENT DURATION</Text>
        {DURATIONS.map((d) => (
          <TouchableOpacity
            key={d.value}
            style={[styles.option, segmentDuration === d.value && styles.optionActive]}
            onPress={() => onSelectDuration(d.value)}
            activeOpacity={0.7}
          >
            <View style={styles.optionInfo}>
              <Text style={[styles.optionLabel, segmentDuration === d.value && styles.optionLabelActive]}>
                {d.label}
              </Text>
              <Text style={styles.optionSub}>{d.sub}</Text>
            </View>
            <MaterialIcons
              name={segmentDuration === d.value ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={22}
              color={segmentDuration === d.value ? Colors.recording : Colors.textMuted}
            />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.startBtn} onPress={onStart} activeOpacity={0.85}>
          <MaterialIcons name="fiber-manual-record" size={18} color="#fff" />
          <Text style={styles.startBtnText}>START LOOP RECORDING</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
));

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  optionActive: {
    borderColor: Colors.recording,
    backgroundColor: 'rgba(255,45,45,0.1)',
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  optionLabelActive: {
    color: Colors.textPrimary,
  },
  optionSub: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  startBtn: {
    backgroundColor: Colors.recording,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.full,
    marginTop: Spacing.md,
  },
  startBtnText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

export default DashcamModal;
