import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surfaceGlassStrong,
          borderTopWidth: 1,
          borderTopColor: 'rgba(100,130,220,0.15)',
          height: Platform.select({
            ios: insets.bottom + 62,
            android: insets.bottom + 62,
            default: 70,
          }),
          paddingTop: 8,
          paddingBottom: Platform.select({
            ios: insets.bottom + 8,
            android: insets.bottom + 8,
            default: 8,
          }),
          shadowColor: '#304090',
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          elevation: 12,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'CAMERA',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIcon : undefined}>
              <MaterialIcons name="camera-alt" size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: 'GALLERY',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIcon : undefined}>
              <MaterialIcons name="photo-library" size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'SETTINGS',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIcon : undefined}>
              <MaterialIcons name="tune" size={size} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIcon: {
    backgroundColor: Colors.primaryDim,
    borderRadius: 10,
    padding: 4,
  },
});
