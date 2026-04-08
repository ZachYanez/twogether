import type { PropsWithChildren, ReactNode } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Layout } from '@/constants/theme';

type ScreenShellProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  accessory?: ReactNode;
  scrollable?: boolean;
}>;

export function ScreenShell({
  children,
  title,
  subtitle,
  accessory,
  scrollable = true,
}: ScreenShellProps) {
  const content = (
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {accessory}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {scrollable ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 24,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    paddingHorizontal: Layout.gutter,
    paddingBottom: 40,
    gap: 32,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 16,
    paddingTop: 8,
  },
  headerCopy: {
    flex: 1,
    gap: 8,
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
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  title: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.37,
    lineHeight: 41,
  },
});
