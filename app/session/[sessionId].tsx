import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ImageBackground,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';

import { APP_IMMERSIVE_BACKGROUND_URL } from '@/constants/immersive-background';
import { Colors, Fonts, Layout } from '@/constants/theme';
import { BackButton } from '@/src/components/back-button';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { StatusBadge } from '@/src/components/status-badge';
import { getDailyQuote } from '@/src/lib/daily-quotes';
import { formatSessionCondition, formatSessionWindow } from '@/src/lib/time';
import type { SessionParticipant } from '@/src/lib/lovelock-types';
import { useLovelockStore } from '@/src/store/lovelock-store';

function FrostedCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <BlurView intensity={48} tint="light" style={[styles.frostedCard, style]}>
      <View style={styles.frostedInner}>{children}</View>
    </BlurView>
  );
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getParticipantPresentation(participant: SessionParticipant) {
  if (participant.localShieldState === 'active') {
    return {
      badgeLabel: 'Deep Focus',
      containerStyle: styles.participantFocusCard,
      dotStyle: styles.participantFocusDot,
      statusStyle: styles.participantFocusStatus,
    };
  }

  if (participant.localShieldState === 'completed') {
    return {
      badgeLabel: 'Complete',
      containerStyle: styles.participantCompleteCard,
      dotStyle: styles.participantCompleteDot,
      statusStyle: styles.participantCompleteStatus,
    };
  }

  if (participant.localShieldState === 'interrupted') {
    return {
      badgeLabel: 'Interrupted',
      containerStyle: styles.participantInterruptedCard,
      dotStyle: styles.participantInterruptedDot,
      statusStyle: styles.participantInterruptedStatus,
    };
  }

  if (participant.acceptanceStatus === 'pending') {
    return {
      badgeLabel: 'Joining',
      containerStyle: styles.participantPendingCard,
      dotStyle: styles.participantPendingDot,
      statusStyle: styles.participantPendingStatus,
    };
  }

  return {
    badgeLabel: 'Present',
    containerStyle: styles.participantPresentCard,
    dotStyle: styles.participantPresentDot,
    statusStyle: styles.participantPresentStatus,
  };
}

function getRemainingDisplay(endIso: string, now: number) {
  const remainingMs = Math.max(0, new Date(endIso).getTime() - now);
  const totalMinutes = Math.max(0, Math.ceil(remainingMs / (1000 * 60)));

  if (totalMinutes >= 60) {
    const roundedHours = Math.ceil(totalMinutes / 60);
    return { label: 'Remaining', unit: 'h', value: String(roundedHours) };
  }

  return { label: 'Remaining', unit: 'm', value: String(totalMinutes) };
}

export default function SessionDetailScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const session = useLovelockStore((s) =>
    s.sessions.find((e) => e.id === sessionId)
  );
  const acceptSession = useLovelockStore((s) => s.acceptSession);
  const activateSession = useLovelockStore((s) => s.activateSession);
  const completeSession = useLovelockStore((s) => s.completeSession);
  const interruptSession = useLovelockStore((s) => s.interruptSession);
  const activeRewardMilestone = useLovelockStore((s) => s.activeRewardMilestone);
  const dismissRewardMilestone = useLovelockStore((s) => s.dismissRewardMilestone);
  const [now, setNow] = useState(() => Date.now());
  const [bypassVisible, setBypassVisible] = useState(false);
  const dailyQuote = useMemo(() => getDailyQuote(), []);
  const isImmersiveSession = session?.status === 'active' || session?.status === 'armed';

  useEffect(() => {
    if (!isImmersiveSession) {
      return;
    }

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [isImmersiveSession]);

  if (!session) {
    return (
      <ScreenShell title="Not found" showBackButton>
        <PrimaryButton
          label="Back to sessions"
          onPress={() => router.replace('/(tabs)/sessions')}
        />
      </ScreenShell>
    );
  }

  const isFinishedSession = ['completed', 'interrupted', 'cancelled'].includes(session.status);
  if (isFinishedSession) {
    return <Redirect href="/(tabs)" />;
  }

  const remaining = getRemainingDisplay(session.scheduledEndAt, now);
  const sessionDetail = session.condition
    ? formatSessionCondition(session.condition)
    : formatSessionWindow(session);
  const headerParticipants = session.participants.slice(0, 2);

  if (isImmersiveSession) {
    return (
      <>
        <ImageBackground source={{ uri: APP_IMMERSIVE_BACKGROUND_URL }} style={styles.backgroundImage}>
          <View style={styles.scrim} />
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.topBar}>
              <View style={styles.topBarIdentity}>
                <BackButton glass />
                <View style={styles.identityStack}>
                  {headerParticipants.map((participant, index) => (
                    <View
                      key={participant.id}
                      style={[
                        styles.identityAvatar,
                        index === 1 && styles.identityAvatarOverlay,
                      ]}>
                      <Text style={styles.identityAvatarText}>
                        {getInitials(participant.displayName)}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.topBarTitleFrosted}>The Sanctuary</Text>
              </View>

              <Pressable
                hitSlop={16}
                onPress={() => {
                  router.push('/(tabs)/settings');
                }}>
                <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.immersiveContent}
              showsVerticalScrollIndicator={false}>
              <FrostedCard>
                <View style={styles.titleBlock}>
                  <Text style={styles.sessionEyebrowFrosted}>
                    {session.status === 'active' ? 'Active Session' : 'Session Ready'}
                  </Text>
                  <Text style={styles.sessionTitleFrosted}>{session.title}</Text>
                  <Text style={styles.sessionDetailFrosted}>{sessionDetail}</Text>
                </View>
              </FrostedCard>

              <View style={styles.timerWrap}>
                <View style={styles.timerGlow} />
                <View style={styles.timerHalo} />
                <View style={styles.timerCircle}>
                  <Text style={styles.timerValue}>
                    {remaining.value}
                    <Text style={styles.timerUnit}>{remaining.unit}</Text>
                  </Text>
                  <Text style={styles.timerLabel}>{remaining.label}</Text>
                </View>
                <View style={styles.timerPulseWrap}>
                  <View style={styles.timerPulseDot} />
                </View>
              </View>

              <FrostedCard>
                <View style={styles.participantGrid}>
                  {session.participants.map((participant) => {
                    const presentation = getParticipantPresentation(participant);
                    return (
                      <View
                        key={participant.id}
                        style={[styles.participantCard, presentation.containerStyle]}>
                        <View style={styles.participantAvatarWrap}>
                          <View style={styles.participantAvatarFrosted}>
                            <Text style={styles.participantAvatarTextFrosted}>
                              {getInitials(participant.displayName)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.participantTextWrap}>
                          <Text style={styles.immersiveParticipantNameFrosted}>
                            {participant.displayName}
                          </Text>
                          <Text style={[styles.participantStatus, presentation.statusStyle]}>
                            {presentation.badgeLabel}
                          </Text>
                        </View>
                        <View style={[styles.participantDot, presentation.dotStyle]} />
                      </View>
                    );
                  })}
                </View>
              </FrostedCard>

              <FrostedCard>
                <View style={styles.quoteBlock}>
                  <Text style={styles.quoteTextFrosted}>{`\u201C${dailyQuote}\u201D`}</Text>
                </View>
              </FrostedCard>

              <View style={styles.immersiveActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.completeButton,
                    pressed && styles.completeButtonPressed,
                  ]}
                  onPress={() => {
                    if (session.status === 'active') {
                      void completeSession(session.id);
                      return;
                    }

                    void activateSession(session.id);
                  }}>
                  <Text style={styles.completeButtonText}>
                    {session.status === 'active' ? 'Complete Session' : 'Begin Session'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setBypassVisible(true);
                  }}>
                  <Text style={styles.interruptTextFrosted}>Emergency bypass</Text>
                </Pressable>
              </View>
            </ScrollView>
          </SafeAreaView>
        </ImageBackground>

        <Modal
          animationType="fade"
          transparent
          visible={Boolean(activeRewardMilestone)}
          onRequestClose={dismissRewardMilestone}>
          <Pressable style={styles.modalBackdrop} onPress={dismissRewardMilestone}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <View style={styles.rewardBadge}>
                <Ionicons name="star" size={40} color={Colors.dark.warning} />
              </View>
              <Text style={styles.rewardEyebrow}>Reward unlocked</Text>
              <Text style={styles.rewardTitle}>{activeRewardMilestone?.name}</Text>
              <Text style={styles.rewardBody}>{activeRewardMilestone?.body}</Text>
              <Text style={styles.rewardMeta}>
                {activeRewardMilestone
                  ? `${activeRewardMilestone.threshold} completed session${
                      activeRewardMilestone.threshold === 1 ? '' : 's'
                    }`
                  : ''}
              </Text>
              <PrimaryButton label="Keep going" onPress={dismissRewardMilestone} />
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          animationType="fade"
          transparent
          visible={bypassVisible}
          onRequestClose={() => setBypassVisible(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setBypassVisible(false)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.rewardEyebrow}>Emergency bypass</Text>
              <Text style={styles.rewardTitle}>Confirm before ending</Text>
              <Text style={styles.rewardBody}>
                This will end the session now, unblock your selected apps, and mark the session as
                cut short in history.
              </Text>
              <PrimaryButton
                label="Confirm bypass"
                destructive
                onPress={() => {
                  setBypassVisible(false);
                  void interruptSession(session.id, 'emergency_bypass');
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      </>
    );
  }

  return (
    <ScreenShell
      title={session.title}
      subtitle={formatSessionWindow(session)}
      showBackButton
      accessory={
        <StatusBadge
          label={session.status.replace('_', ' ')}
          status={session.status}
        />
      }>
      <View style={styles.participants}>
        {session.participants.map((p) => (
          <View key={p.id} style={styles.participant}>
            <View style={styles.participantInfoRow}>
              <View style={styles.listAvatar}>
                <Text style={styles.listAvatarText}>{getInitials(p.displayName)}</Text>
              </View>
              <View style={styles.participantInfoCopy}>
                <Text style={styles.participantName}>{p.displayName}</Text>
                <Text style={styles.participantStatusText}>
                  {p.acceptanceStatus} · {p.localShieldState}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="Accept"
          secondary
          onPress={() => {
            void acceptSession(session.id);
          }}
        />
        <PrimaryButton
          label="Activate"
          onPress={() => {
            void activateSession(session.id);
          }}
        />
        <PrimaryButton
          label="Complete"
          onPress={() => {
            void completeSession(session.id);
          }}
        />
        <PrimaryButton
          label="Emergency bypass"
          destructive
          onPress={() => {
            setBypassVisible(true);
          }}
        />
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(activeRewardMilestone)}
        onRequestClose={dismissRewardMilestone}>
        <Pressable style={styles.modalBackdrop} onPress={dismissRewardMilestone}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.rewardBadge}>
              <Ionicons name="star" size={40} color={Colors.dark.warning} />
            </View>
            <Text style={styles.rewardEyebrow}>Reward unlocked</Text>
            <Text style={styles.rewardTitle}>{activeRewardMilestone?.name}</Text>
            <Text style={styles.rewardBody}>{activeRewardMilestone?.body}</Text>
            <Text style={styles.rewardMeta}>
              {activeRewardMilestone
                ? `${activeRewardMilestone.threshold} completed session${
                    activeRewardMilestone.threshold === 1 ? '' : 's'
                  }`
                : ''}
            </Text>
            <PrimaryButton label="Keep going" onPress={dismissRewardMilestone} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={bypassVisible}
        onRequestClose={() => setBypassVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setBypassVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.rewardEyebrow}>Emergency bypass</Text>
            <Text style={styles.rewardTitle}>Confirm the bypass</Text>
            <Text style={styles.rewardBody}>
              This will end the session now, unblock your selected apps, and mark the session as
              cut short in history.
            </Text>
            <PrimaryButton
              label="Confirm bypass"
              destructive
              onPress={() => {
                setBypassVisible(false);
                void interruptSession(session.id, 'emergency_bypass');
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10 },
  backgroundImage: {
    flex: 1,
  },
  completeButton: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 999,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 20,
    shadowColor: '#400408',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
  },
  completeButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontFamily: Fonts.display,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  frostedCard: {
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  frostedInner: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 10,
    padding: 20,
  },
  identityAvatar: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  identityAvatarOverlay: {
    marginLeft: -10,
  },
  identityAvatarText: {
    color: '#FFFFFF',
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    fontWeight: '700',
  },
  identityStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  immersiveActions: {
    gap: 14,
    paddingTop: 4,
  },
  immersiveContent: {
    gap: 36,
    paddingBottom: 48,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  immersiveParticipantNameFrosted: {
    color: '#FFFFFF',
    fontFamily: Fonts.display,
    fontSize: 14,
    fontWeight: '700',
  },
  interruptTextFrosted: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  listAvatar: {
    alignItems: 'center',
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  listAvatarText: {
    color: Colors.dark.accent,
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    fontWeight: '700',
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(28, 28, 30, 0.48)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.dark.background,
    borderRadius: 28,
    gap: 12,
    maxWidth: 360,
    padding: 24,
    width: '100%',
  },
  participant: {
    backgroundColor: Colors.dark.card,
    borderColor: Colors.dark.border,
    borderRadius: Layout.radiusMd,
    borderWidth: 1,
    padding: 16,
  },
  participantAvatarFrosted: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  participantAvatarTextFrosted: {
    color: Colors.dark.accent,
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    fontWeight: '700',
  },
  participantAvatarWrap: {
    flexShrink: 0,
  },
  participantCard: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  participantCompleteCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
  },
  participantCompleteDot: {
    backgroundColor: Colors.dark.success,
  },
  participantCompleteStatus: {
    color: Colors.dark.success,
  },
  participantDot: {
    borderColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 2,
    height: 12,
    width: 12,
  },
  participantFocusCard: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderWidth: 1,
  },
  participantFocusDot: {
    backgroundColor: Colors.dark.success,
  },
  participantFocusStatus: {
    color: Colors.dark.accent,
    fontWeight: '700',
  },
  participantGrid: {
    gap: 12,
  },
  participantInfoCopy: {
    flex: 1,
    gap: 2,
  },
  participantInfoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  participantInterruptedCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,120,100,0.35)',
    borderWidth: 1,
  },
  participantInterruptedDot: {
    backgroundColor: Colors.dark.danger,
  },
  participantInterruptedStatus: {
    color: Colors.dark.danger,
  },
  participantName: {
    color: Colors.dark.text,
    fontFamily: Fonts.bodyMedium,
    fontSize: 17,
    fontWeight: '600',
  },
  participantPendingCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
  },
  participantPendingDot: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  participantPendingStatus: {
    color: 'rgba(255,255,255,0.58)',
  },
  participantPresentCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
  },
  participantPresentDot: {
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  participantPresentStatus: {
    color: 'rgba(255,255,255,0.72)',
  },
  participantStatus: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    fontWeight: '500',
  },
  participantStatusText: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '400',
    textTransform: 'capitalize',
  },
  participantTextWrap: {
    flex: 1,
    gap: 2,
  },
  participants: { gap: 10 },
  quoteBlock: {
    opacity: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  quoteTextFrosted: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: Fonts.body,
    fontSize: 16,
    fontStyle: 'italic',
    fontWeight: '400',
    lineHeight: 24,
    textAlign: 'center',
  },
  rewardBadge: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 159, 10, 0.14)',
    borderRadius: 999,
    height: 88,
    justifyContent: 'center',
    marginBottom: 4,
    width: 88,
  },
  rewardBody: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    textAlign: 'center',
  },
  rewardEyebrow: {
    color: Colors.dark.warning,
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  rewardMeta: {
    color: Colors.dark.textTertiary,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
  rewardTitle: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
  },
  safeArea: {
    flex: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 18, 14, 0.34)',
  },
  sessionDetailFrosted: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    textAlign: 'center',
  },
  sessionEyebrowFrosted: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: Fonts.bodyMedium,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  sessionTitleFrosted: {
    color: '#FFFFFF',
    fontFamily: Fonts.display,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 40,
    textAlign: 'center',
  },
  timerCircle: {
    alignItems: 'center',
    backgroundColor: 'rgba(252, 249, 248, 0.84)',
    borderColor: 'rgba(218, 193, 191, 0.32)',
    borderRadius: 999,
    borderWidth: 1,
    height: 224,
    justifyContent: 'center',
    width: 224,
  },
  timerGlow: {
    backgroundColor: 'rgba(240, 237, 237, 0.6)',
    borderRadius: 999,
    height: 256,
    opacity: 0.65,
    position: 'absolute',
    width: 256,
  },
  timerHalo: {
    borderColor: 'rgba(218, 193, 191, 0.3)',
    borderRadius: 999,
    borderWidth: 1,
    height: 192,
    opacity: 0.4,
    position: 'absolute',
    width: 192,
  },
  timerLabel: {
    color: '#5A6055',
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  timerPulseDot: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  timerPulseWrap: {
    left: '50%',
    marginLeft: -4,
    position: 'absolute',
    top: 20,
  },
  timerUnit: {
    color: Colors.dark.accent,
    fontWeight: '800',
  },
  timerValue: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 64,
    fontWeight: '300',
    letterSpacing: -2.2,
  },
  timerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 264,
  },
  titleBlock: {
    gap: 6,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  topBarIdentity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  topBarTitleFrosted: {
    color: '#FFFFFF',
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
});
