/**
 * Permission Wizard — shown on first launch
 * Requests: Camera, Microphone, Location (with location-on prompt), Media Library
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Linking,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { Audio } from 'expo-av';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type PermissionStatus = 'idle' | 'granted' | 'denied';

interface PermItem {
  id: string;
  icon: any;
  title: string;
  desc: string;
  status: PermissionStatus;
}

interface PermissionWizardProps {
  visible: boolean;
  onComplete: () => void;
}

export default function PermissionWizard({ visible, onComplete }: PermissionWizardProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState(0);
  const [requesting, setRequesting] = useState(false);
  const [perms, setPerms] = useState<PermItem[]>([
    {
      id: 'camera',
      icon: 'camera-alt',
      title: 'Camera & Microphone',
      desc: 'Required to capture photos and record videos with GPS stamps.',
      status: 'idle',
    },
    {
      id: 'location',
      icon: 'gps-fixed',
      title: 'Location Access',
      desc: 'Used to overlay real-time GPS coordinates, speed, heading and address on your captures.',
      status: 'idle',
    },
    {
      id: 'storage',
      icon: 'photo-library',
      title: 'Gallery & Storage',
      desc: 'Needed to save your photos and videos to your device library.',
      status: 'idle',
    },
  ]);

  useEffect(() => {
    if (visible) {
      setStep(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [visible]);

  const updatePerm = (id: string, status: PermissionStatus) => {
    setPerms((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  };

  const requestCurrent = useCallback(async () => {
    setRequesting(true);
    const current = perms[step];
    try {
      if (current.id === 'camera') {
        const cam = await Camera.requestCameraPermissionsAsync();
        await Audio.requestPermissionsAsync();
        updatePerm('camera', cam.status === 'granted' ? 'granted' : 'denied');
      } else if (current.id === 'location') {
        const loc = await Location.requestForegroundPermissionsAsync();
        updatePerm('location', loc.status === 'granted' ? 'granted' : 'denied');
        if (loc.status !== 'granted') {
          // Prompt user to enable location in settings
        }
      } else if (current.id === 'storage') {
        const lib = await MediaLibrary.requestPermissionsAsync();
        updatePerm('storage', lib.status === 'granted' ? 'granted' : 'denied');
      }
    } finally {
      setRequesting(false);
      // Move to next step after short delay
      setTimeout(() => {
        if (step < perms.length - 1) {
          setStep((s) => s + 1);
        } else {
          handleFinish();
        }
      }, 600);
    }
  }, [step, perms]);

  const handleFinish = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      onComplete();
    });
  };

  const skipAll = () => handleFinish();

  const openSettings = () => Linking.openSettings();

  const current = perms[step];
  const allGranted = perms.every((p) => p.status === 'granted');
  const progress = (step / perms.length) * 100;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={[styles.card, { paddingTop: insets.top + Spacing.xl }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.logoCircle}>
              <MaterialIcons name="gps-fixed" size={32} color={Colors.gpsGreen} />
            </View>
            <Text style={styles.appName}>SmartGpsCam</Text>
            <Text style={styles.subtitle}>Professional GPS Camera</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.stepLabel}>
            Step {step + 1} of {perms.length}
          </Text>

          {/* Perm list */}
          <View style={styles.permList}>
            {perms.map((p, i) => (
              <View
                key={p.id}
                style={[
                  styles.permRow,
                  i === step && styles.permRowActive,
                  p.status === 'granted' && styles.permRowGranted,
                  p.status === 'denied' && styles.permRowDenied,
                ]}
              >
                <View style={[styles.permIcon, i === step && styles.permIconActive]}>
                  <MaterialIcons
                    name={p.icon}
                    size={22}
                    color={
                      p.status === 'granted'
                        ? Colors.gpsGreen
                        : p.status === 'denied'
                        ? Colors.recording
                        : i === step
                        ? Colors.primary
                        : Colors.textMuted
                    }
                  />
                </View>
                <View style={styles.permText}>
                  <Text
                    style={[
                      styles.permTitle,
                      i !== step && i > step && { color: Colors.textMuted },
                    ]}
                  >
                    {p.title}
                  </Text>
                  {i === step && <Text style={styles.permDesc}>{p.desc}</Text>}
                </View>
                <View style={styles.permStatus}>
                  {p.status === 'granted' && (
                    <MaterialIcons name="check-circle" size={20} color={Colors.gpsGreen} />
                  )}
                  {p.status === 'denied' && (
                    <MaterialIcons name="cancel" size={20} color={Colors.recording} />
                  )}
                  {p.status === 'idle' && i < step && (
                    <MaterialIcons name="radio-button-unchecked" size={20} color={Colors.textMuted} />
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Location-on notice */}
          {current?.id === 'location' && (
            <View style={styles.locationNotice}>
              <MaterialIcons name="info-outline" size={14} color={Colors.warning} />
              <Text style={styles.locationNoticeText}>
                Please ensure your device Location (GPS) is turned ON in system settings for best accuracy.
              </Text>
            </View>
          )}

          {/* Denied notice */}
          {current?.status === 'denied' && (
            <TouchableOpacity style={styles.settingsBtn} onPress={openSettings}>
              <MaterialIcons name="settings" size={14} color={Colors.primary} />
              <Text style={styles.settingsBtnText}>Open Device Settings to grant permission</Text>
            </TouchableOpacity>
          )}

          {/* CTA */}
          <View style={styles.actions}>
            {!allGranted ? (
              <TouchableOpacity
                style={[styles.grantBtn, requesting && styles.grantBtnBusy]}
                onPress={requestCurrent}
                disabled={requesting}
                activeOpacity={0.85}
              >
                <MaterialIcons
                  name={requesting ? 'hourglass-empty' : 'lock-open'}
                  size={18}
                  color="#fff"
                />
                <Text style={styles.grantBtnText}>
                  {requesting ? 'Requesting...' : `Allow ${current?.title}`}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.startBtn} onPress={handleFinish} activeOpacity={0.85}>
                <MaterialIcons name="camera-alt" size={18} color="#fff" />
                <Text style={styles.startBtnText}>Launch SmartGpsCam</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.skipBtn} onPress={skipAll}>
              <Text style={styles.skipText}>Skip & Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.15)',
  },
  headerRow: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,255,136,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(0,255,136,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  appName: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    letterSpacing: 2,
    marginTop: 2,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(0,255,136,0.15)',
    borderRadius: 2,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: Colors.gpsGreen,
    borderRadius: 2,
  },
  stepLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'right',
    marginBottom: Spacing.lg,
  },
  permList: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  permRowActive: {
    borderColor: 'rgba(0,102,204,0.5)',
    backgroundColor: 'rgba(0,102,204,0.1)',
  },
  permRowGranted: {
    borderColor: 'rgba(0,255,136,0.35)',
    backgroundColor: 'rgba(0,255,136,0.05)',
  },
  permRowDenied: {
    borderColor: 'rgba(255,45,45,0.35)',
  },
  permIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permIconActive: { backgroundColor: 'rgba(0,102,204,0.2)' },
  permText: { flex: 1 },
  permTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: '700',
    marginBottom: 2,
  },
  permDesc: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    lineHeight: 17,
  },
  permStatus: { justifyContent: 'center' },
  locationNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,204,0,0.1)',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,204,0,0.3)',
    marginBottom: Spacing.md,
  },
  locationNoticeText: {
    color: Colors.warning,
    fontSize: FontSize.xs,
    flex: 1,
    lineHeight: 17,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  settingsBtnText: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    textDecorationLine: 'underline',
  },
  actions: { gap: Spacing.sm },
  grantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
  },
  grantBtnBusy: { opacity: 0.6 },
  grantBtnText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.gpsGreen,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
  },
  startBtnText: {
    color: '#000',
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  skipBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  skipText: { color: Colors.textMuted, fontSize: FontSize.sm },
});
