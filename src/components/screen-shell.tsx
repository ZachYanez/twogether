import type { PropsWithChildren, ReactNode } from 'react';
import {
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { APP_IMMERSIVE_BACKGROUND_URL } from '@/constants/immersive-background';
import { Colors, Fonts, Layout } from '@/constants/theme';
import { BackButton } from '@/src/components/back-button';
import { DrawerMenuButton } from '@/src/components/drawer-menu-button';

type ScreenShellProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  accessory?: ReactNode;
  scrollable?: boolean;
  showBackButton?: boolean;
  showMenuButton?: boolean;
  /** Photo backdrop + scrim + light header (matches home frosted theme). */
  immersive?: boolean;
}>;

export function ScreenShell({
  children,
  title,
  subtitle,
  accessory,
  scrollable = true,
  showBackButton = false,
  showMenuButton = false,
  immersive = false,
}: ScreenShellProps) {
  const titleStyle = immersive ? styles.titleImmersive : styles.title;
  const subtitleStyle = immersive ? styles.subtitleImmersive : styles.subtitle;

  const content = (
    <View style={styles.content}>
      <View style={styles.topRow}>
        {showMenuButton ? (
          <DrawerMenuButton tint={immersive ? 'dark' : 'light'} />
        ) : showBackButton ? (
          <BackButton glass={immersive} />
        ) : (
          <View />
        )}
        {accessory ? <View style={styles.accessoryWrap}>{accessory}</View> : <View />}
      </View>
      {title || subtitle ? (
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            {title ? <Text style={titleStyle}>{title}</Text> : null}
            {subtitle ? <Text style={subtitleStyle}>{subtitle}</Text> : null}
          </View>
        </View>
      ) : null}
      <View style={styles.body}>{children}</View>
    </View>
  );

  const scrollBody =
    scrollable ? (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {content}
      </ScrollView>
    ) : (
      content
    );

  if (immersive) {
    return (
      <ImageBackground
        source={{ uri: APP_IMMERSIVE_BACKGROUND_URL }}
        style={styles.immBackground}>
        <View style={styles.immScrim} />
        <SafeAreaView style={styles.safeArea}>{scrollBody}</SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>{scrollBody}</SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 20,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    gap: 28,
    paddingBottom: 48,
    paddingHorizontal: Layout.gutter,
  },
  header: {
    alignItems: 'flex-start',
    gap: 16,
  },
  headerCopy: {
    flex: 1,
    gap: 10,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 38,
    paddingTop: 12,
  },
  accessoryWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
  },
  subtitle: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.1,
    lineHeight: 24,
  },
  subtitleImmersive: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: Fonts.body,
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.1,
    lineHeight: 24,
  },
  title: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 41,
  },
  titleImmersive: {
    color: '#FFFFFF',
    fontFamily: Fonts.display,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 41,
  },
  immBackground: {
    flex: 1,
  },
  immScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 18, 14, 0.34)',
  },
});
