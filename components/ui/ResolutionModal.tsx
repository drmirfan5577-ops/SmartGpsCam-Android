import React, { memo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { RESOLUTIONS, ResolutionKey } from '@/constants/config';

interface Props {
  visible: boolean;
  current: ResolutionKey;
  onSelect: (res: ResolutionKey) => void;
  onClose: () => void;
}

const BADGES: Record<ResolutionKey, { label: string; color: string }> = {
  HD: { label: 'SD', color: '#555' },
  'Full HD': { label: 'FHD', color: '#0066cc' },
  '2K': { label: '2K', color: '#7b2fff' },
  '4K': { label: '4K', color: '#ff6600' },
  '8K': { label: '8K', color: '#ff2d2d' },
};

const ResolutionModal = memo(({ visible, current, onSelect, onClose }: Props) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Resolution</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Select capture quality</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {(Object.keys(RESOLUTIONS) as ResolutionKey[]).map((res) => {
              const isSelected = current === res;
              const badge = BADGES[res];
              return (
                <TouchableOpacity
                  key={res}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => onSelect(res)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.badge, { backgroundColor: badge.color }]}>
                    <Text style={styles.badgeText}>{badge.label}</Text>
                  </View>
                  <View style={styles.optionInfo}>
                    <Text style={[styles.optionName, isSelected && styles.optionNameSelected]}>
                      {res}
                    </Text>
                    <Text style={styles.optionDim}>{RESOLUTIONS[res].label}</Text>
                  </View>
                  {isSelected ? (
                    <MaterialIcons name="check-circle" size={22} color={Colors.primary} />
                  ) : (
                    <MaterialIcons name="radio-button-unchecked" size={22} color={Colors.textMuted} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginBottom: Spacing.lg,
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
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryDim,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  badgeText: {
    color: '#fff',
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  optionNameSelected: {
    color: Colors.textPrimary,
  },
  optionDim: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
    fontFamily: 'monospace' as any,
  },
});

export default ResolutionModal;
