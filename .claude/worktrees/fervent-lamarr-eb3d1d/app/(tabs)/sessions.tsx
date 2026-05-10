import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { GlassCard } from '@/src/components/glass-card';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { SessionCard } from '@/src/components/session-card';
import { fetchSessionFeed } from '@/src/lib/mock-api';
import { getScopeLabel } from '@/src/lib/session-templates';
import { formatTemplateDuration, formatTemplateSchedule } from '@/src/lib/time';
import { useTwogetherStore } from '@/src/store/twogether-store';

export default function SessionsScreen() {
  const router = useRouter();
  const sessions = useTwogetherStore((s) => s.sessions);
  const sessionTemplates = useTwogetherStore((s) => s.sessionTemplates);
  const revision = useTwogetherStore((s) => s.revision);
  const startTemplateSession = useTwogetherStore((s) => s.startTemplateSession);
  const toggleSessionTemplate = useTwogetherStore((s) => s.toggleSessionTemplate);

  const { data: feed = [] } = useQuery({
    queryKey: ['sessions', revision],
    queryFn: () => fetchSessionFeed(sessions),
  });

  const quickStarts = sessionTemplates.filter((template) => template.shortSessionMode);

  return (
    <ScreenShell title="Sessions" subtitle="Plan shared rituals and protect short windows.">
      <PrimaryButton label="New session or schedule" onPress={() => router.push('/session/new')} />

      {quickStarts.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Short-session mode</Text>
          <View style={styles.list}>
            {quickStarts.slice(0, 3).map((template) => (
              <GlassCard key={template.id} style={styles.templateCard}>
                <View style={styles.templateHeader}>
                  <View style={styles.templateCopy}>
                    <Text style={styles.templateTitle}>{template.title}</Text>
                    <Text style={styles.templateMeta}>
                      {getScopeLabel(template.sessionScope)} · {formatTemplateDuration(template)}
                    </Text>
                  </View>
                  <PrimaryButton
                    label="Start now"
                    secondary
                    onPress={() => {
                      void startTemplateSession(template.id).then((sessionId) => {
                        if (sessionId) {
                          router.push(`/session/${sessionId}`);
                        }
                      });
                    }}
                  />
                </View>
              </GlassCard>
            ))}
          </View>
        </View>
      ) : null}

      {sessionTemplates.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recurring scheduler</Text>
          <View style={styles.list}>
            {sessionTemplates.map((template) => (
              <GlassCard key={template.id} style={styles.templateCard}>
                <View style={styles.templateHeader}>
                  <View style={styles.templateCopy}>
                    <Text style={styles.templateTitle}>{template.title}</Text>
                    <Text style={styles.templateMeta}>
                      {getScopeLabel(template.sessionScope)} · {formatTemplateDuration(template)}
                    </Text>
                    <Text style={styles.templateSchedule}>
                      {formatTemplateSchedule(template)}
                    </Text>
                  </View>
                </View>
                <View style={styles.templateActions}>
                  <PrimaryButton
                    label="Start now"
                    secondary
                    onPress={() => {
                      void startTemplateSession(template.id).then((sessionId) => {
                        if (sessionId) {
                          router.push(`/session/${sessionId}`);
                        }
                      });
                    }}
                  />
                  <PrimaryButton
                    label={template.status === 'active' ? 'Pause' : 'Resume'}
                    secondary
                    onPress={() => {
                      void toggleSessionTemplate(
                        template.id,
                        template.status === 'active' ? 'paused' : 'active'
                      );
                    }}
                  />
                </View>
              </GlassCard>
            ))}
          </View>
        </View>
      ) : null}

      {feed.length === 0 ? (
        <Text style={styles.empty}>No scheduled sessions yet.</Text>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          <View style={styles.list}>
            {feed.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: Colors.dark.textTertiary,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
    paddingVertical: 32,
    textAlign: 'center',
  },
  list: {
    gap: 10,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  templateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  templateCard: {
    gap: 12,
  },
  templateCopy: {
    flex: 1,
    gap: 4,
  },
  templateHeader: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  templateMeta: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '400',
  },
  templateSchedule: {
    color: Colors.dark.textTertiary,
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '400',
  },
  templateTitle: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '600',
  },
});
