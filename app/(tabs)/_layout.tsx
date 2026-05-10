import { Ionicons } from '@expo/vector-icons';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Drawer } from 'expo-router/drawer';
import { Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Layout } from '@/constants/theme';
import { useLovelockStore } from '@/src/store/lovelock-store';

type NavItem = {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const NAV_ITEMS: NavItem[] = [
  { name: 'index', label: 'Home', icon: 'home' },
  { name: 'sessions', label: 'Sessions', icon: 'shield-checkmark' },
  { name: 'history', label: 'History', icon: 'time' },
  { name: 'settings', label: 'Settings', icon: 'settings-sharp' },
];

function CustomDrawerContent({ state, navigation }: DrawerContentComponentProps) {
  const currentUser = useLovelockStore((s) => s.currentUser);
  const partner = useLovelockStore((s) => s.partner);

  return (
    <DrawerContentScrollView
      scrollEnabled={false}
      contentContainerStyle={styles.drawerScrollContent}>
      <SafeAreaView style={styles.drawerInner}>
        <View style={styles.drawerHeader}>
          <Text style={styles.appName}>Love Lock</Text>
          {currentUser ? (
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {currentUser.displayName ?? 'You'}
              </Text>
              {partner ? (
                <Text style={styles.partnerName}>with {partner.displayName}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        <View style={styles.navList}>
          {NAV_ITEMS.map((item, index) => {
            const isActive = state.index === index;
            return (
              <Pressable
                key={item.name}
                onPress={() => navigation.navigate(item.name)}
                style={({ pressed }) => [
                  styles.navItem,
                  isActive && styles.navItemActive,
                  pressed && !isActive && styles.navItemPressed,
                ]}>
                <Ionicons
                  name={item.icon}
                  size={21}
                  color={isActive ? Colors.dark.accent : Colors.dark.textSecondary}
                />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </DrawerContentScrollView>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: styles.drawer,
        drawerType: Platform.OS === 'ios' ? 'slide' : 'front',
        overlayColor: 'rgba(12, 18, 14, 0.32)',
        swipeEdgeWidth: 48,
      }}>
      <Drawer.Screen name="index" options={{ title: 'Home' }} />
      <Drawer.Screen name="sessions" options={{ title: 'Sessions' }} />
      <Drawer.Screen name="history" options={{ title: 'History' }} />
      <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  appName: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  divider: {
    backgroundColor: Colors.dark.border,
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Layout.gutter,
    marginVertical: 20,
  },
  drawer: {
    backgroundColor: Colors.dark.background,
    width: 280,
  },
  drawerHeader: {
    gap: 6,
    paddingHorizontal: Layout.gutter,
    paddingTop: 20,
  },
  drawerInner: {
    flex: 1,
  },
  drawerScrollContent: {
    flex: 1,
  },
  navItem: {
    alignItems: 'center',
    borderRadius: Layout.radiusMd,
    flexDirection: 'row',
    gap: 14,
    marginHorizontal: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  navItemActive: {
    backgroundColor: 'rgba(93, 26, 26, 0.07)',
  },
  navItemPressed: {
    backgroundColor: Colors.dark.surface,
  },
  navLabel: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    fontWeight: '500',
  },
  navLabelActive: {
    color: Colors.dark.accent,
    fontFamily: Fonts.display,
    fontWeight: '700',
  },
  navList: {
    gap: 4,
  },
  partnerName: {
    color: Colors.dark.textTertiary,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '400',
  },
  userInfo: {
    gap: 2,
  },
  userName: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
  },
});
