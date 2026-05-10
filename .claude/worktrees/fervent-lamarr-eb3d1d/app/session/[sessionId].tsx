import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';

import { Colors, Fonts, Layout } from '@/constants/theme';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { StatusBadge } from '@/src/components/status-badge';
import { getDailyQuote } from '@/src/lib/daily-quotes';
import { formatSessionCondition, formatSessionWindow } from '@/src/lib/time';
import type { SessionParticipant } from '@/src/lib/twogether-types';
import { useTwogetherStore } from '@/src/store/twogether-store';

function getInitials(name: string) {
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
  const session = useTwogetherStore((s) =>
    s.sessions.find((e) => e.id === sessionId)
  );
  const acceptSession = useTwogetherStore((s) => s.acceptSession);
  const activateSession = useTwogetherStore((s) => s.activateSession);
  const completeSession = useTwogetherStore((s) => s.completeSession);
  const interruptSession = useTwogetherStore((s) => s.interruptSession);
  const activeRewardMilestone = useTwogetherStore((s) => s.activeRewardMilestone);
  const dismissRewardMilestone = useTwogetherStore((s) => s.dismissRewardMilestone);
  const [now, setNow] = useState(() => Date.now());
  const [bypassVisible, setBypassVisible] = useState(false);
  const [bypassReason, setBypassReason] = useState('Urgent call');
  const [bypassPhrase, setBypassPhrase] = useState('');
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
      <ScreenShell title="Not found">
        <PrimaryButton
          label="Back to sessions"
          onPress={() => router.replace('/(tabs)/sessions')}
        />
      </ScreenShell>
    );
  }

  const remaining = getRemainingDisplay(session.scheduledEndAt, now);
  const sessionDetail = session.condition
    ? formatSessionCondition(session.condition)
    : formatSessionWindow(session);
  const headerParticipants = session.participants.slice(0, 2);

  if (isImmersiveSession) {
    return (
      <>
        <View style={styles.screen}>
          <View style={styles.backgroundOrbPrimary} />
          <View style={styles.backgroundOrbSecondary} />
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.topBar}>
              <View style={styles.topBarIdentity}>
                <View style={styles.identityStack}>
                  {headerParticipants.map((participant, index) => (
                    <View
                      key={participant.id}
                      style={[
                        styles.identityAvatar,
                        index === 1 ? styles.identityAvatarOverlay : null,
                      ]}>
                      <Text style={styles.identityAvatarText}>
                        {getInitials(participant.displayName)}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.topBarTitle}>The Sanctuary</Text>
              </View>

              <Pressable
                hitSlop={12}
                onPress={() => {
                  router.push('/(tabs)/settings');
                }}>
                <Ionicons name="settings-outline" size={22} color={Colors.dark.accent} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.immersiveContent}
              showsVerticalScrollIndicator={false}>
              <View style={styles.titleBlock}>
                <Text style={styles.sessionEyebrow}>
                  {session.status === 'active' ? 'Active Session' : 'Session Ready'}
                </Text>
                <Text style={styles.sessionTitle}>{session.title}</Text>
                <Text style={styles.sessionDetail}>{sessionDetail}</Text>
              </View>

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

              <View style={styles.participantGrid}>
                {session.participants.map((participant) => {
                  const presentation = getParticipantPresentation(participant);
                  return (
                    <View
                      key={participant.id}
                      style={[styles.participantCard, presentation.containerStyle]}>
                      <View style={styles.participantAvatarWrap}>
                        <View style={styles.participantAvatar}>
                          <Text style={styles.participantAvatarText}>
                            {getInitials(participant.displayName)}
                          </Text>
                        </View>
                        <View style={[styles.participantDot, presentation.dotStyle]} />
                      </View>
                      <View style={styles.participantTextWrap}>
                        <Text style={styles.immersiveParticipantName}>{participant.displayName}</Text>
                        <Text style={[styles.participantStatus, presentation.statusStyle]}>
                          {presentation.badgeLabel}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.quoteBlock}>
                <Text style={styles.quoteText}>{`"${dailyQuote}"`}</Text>
              </View>

              <View style={styles.immersiveActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.completeButton,
                    pressed ? styles.completeButtonPressed : null,
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
                  <Text style={styles.interruptText}>Emergency bypass</Text>
                </Pressable>
              </View>
            </ScrollView>
          </SafeAreaView>
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
              <Text style={styles.rewardTitle}>Confirm before ending the session</Text>
              <Text style={styles.rewardBody}>
                Choose a reason, then type `BYPASS`. This keeps bypasses intentional instead of
                impulsive.
              </Text>
              <View style={styles.bypassReasons}>
                {['Urgent call', 'Travel or safety', 'Child or family', 'Work emergency'].map(
                  (reason) => (
                    <Pressable
                      key={reason}
                      onPress={() => setBypassReason(reason)}
                      style={[
                        styles.bypassReasonChip,
                        bypassReason === reason ? styles.bypassReasonChipActive : null,
                      ]}>
                      <Text
                        style={[
                          styles.bypassReasonText,
                          bypassReason === reason ? styles.bypassReasonTextActive : null,
                        ]}>
                        {reason}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>
              <TextInput
                value={bypassPhrase}
                onChangeText={setBypassPhrase}
                autoCapitalize="characters"
                placeholder="Type BYPASS"
                placeholderTextColor={Colors.dark.textTertiary}
                style={styles.bypassInput}
              />
              <PrimaryButton
                label="Confirm bypass"
                destructive
                disabled={bypassPhrase.trim().toUpperCase() !== 'BYPASS'}
                onPress={() => {
                  setBypassVisible(false);
                  setBypassPhrase('');
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
      accessory={
        <StatusBadge
          label={session.status.replace('_', ' ')}
          status={session.status}
        />
      }>
      <View style={styles.participants}>
        {session.participants.map((p) => (
          <View key={p.id} style={styles.participant}>
            <Text style={styles.participantName}>{p.displayName}</Text>
            <Text style={styles.participantStatus}>
              {p.acceptanceStatus} · {p.localShieldState}
            </Text>
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
              Type `BYPASS` before the app will interrupt an active session.
            </Text>
            <View style={styles.bypassReasons}>
              {['Urgent call', 'Travel or safety', 'Child or family', 'Work emergency'].map(
                (reason) => (
                  <Pressable
                    key={reason}
                    onPress={() => setBypassReason(reason)}
                    style={[
                      styles.bypassReasonChip,
                      bypassReason === reason ? styles.bypassReasonChipActive : null,
                    ]}>
                    <Text
                      style={[
                        styles.bypassReasonText,
                        bypassReason === reason ? styles.bypassReasonTextActive : null,
                      ]}>
                      {reason}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
            <TextInput
              value={bypassPhrase}
              onChangeText={setBypassPhrase}
              autoCapitalize="characters"
              placeholder="Type BYPASS"
              placeholderTextColor={Colors.dark.textTertiary}
              style={styles.bypassInput}
            />
            <PrimaryButton
              label="Confirm bypass"
              destructive
              disabled={bypassPhrase.trim().toUpperCase() !== 'BYPASS'}
              onPress={() => {
                setBypassVisible(false);
                setBypassPhrase('');
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
  actions: { gap: 8 },
  backgroundOrbPrimary: {
    backgroundColor: 'rgba(244, 223, 203, 0.34)',
    borderRadius: 999,
    height: 240,
    position: 'absolute',
    right: -70,
    top: -20,
    width: 240,
  },
  backgroundOrbSecondary: {
    backgroundColor: 'rgba(255, 179, 175, 0.16)',
    borderRadius: 999,
    bottom: -120,
    height: 300,
    left: -120,
    position: 'absolute',
    width: 300,
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
  identityAvatar: {
    alignItems: 'center',
    backgroundColor: Colors.dark.surfaceElevated,
    borderColor: 'rgba(135, 114, 113, 0.16)',
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
    color: Colors.dark.accent,
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
  interruptText: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  bypassInput: {
    backgroundColor: Colors.dark.surface,
    borderColor: Colors.dark.border,
    borderRadius: Layout.radiusMd,
    borderWidth: 1,
    color: Colors.dark.text,
    fontFamily: Fonts.body,
    fontSize: 16,
    fontWeight: '400',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  bypassReasonChip: {
    borderColor: Colors.dark.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bypassReasonChipActive: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  bypassReasonText: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    fontWeight: '600',
  },
  bypassReasonTextActive: {
    color: '#FFFFFF',
  },
  bypassReasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(28, 28, 30, 0.42)',
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
    backgroundColor: Colors.dark.surface,
    borderRadius: Layout.radiusMd,
    gap: 2,
    padding: 14,
  },
  participantName: {
    color: Colors.dark.text,
    fontFamily: Fonts.bodyMedium,
    fontSize: 17,
    fontWeight: '600',
  },
  participantStatus: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '400',
    textTransform: 'capitalize',
  },
  participants: { gap: 8 },
  participantAvatar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  participantAvatarText: {
    color: Colors.dark.accent,
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    fontWeight: '700',
  },
  participantAvatarWrap: {
    position: 'relative',
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
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(135, 114, 113, 0.08)',
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
    bottom: -1,
    height: 12,
    position: 'absolute',
    right: -1,
    width: 12,
  },
  participantFocusCard: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(135, 114, 113, 0.08)',
    borderWidth: 1,
    shadowColor: '#1B1B1B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
  },
  participantFocusDot: {
    backgroundColor: Colors.dark.accent,
  },
  participantFocusStatus: {
    color: Colors.dark.accent,
    fontWeight: '700',
  },
  participantGrid: {
    gap: 14,
  },
  participantInterruptedCard: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(135, 114, 113, 0.08)',
    borderWidth: 1,
  },
  participantInterruptedDot: {
    backgroundColor: Colors.dark.danger,
  },
  participantInterruptedStatus: {
    color: Colors.dark.danger,
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
  immersiveParticipantName: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 14,
    fontWeight: '700',
  },
  participantPendingCard: {
    backgroundColor: Colors.dark.surfaceElevated,
  },
  participantPendingDot: {
    backgroundColor: Colors.dark.textTertiary,
  },
  participantPendingStatus: {
    color: Colors.dark.textTertiary,
  },
  participantPresentCard: {
    backgroundColor: Colors.dark.surfaceElevated,
  },
  participantPresentDot: {
    backgroundColor: '#5A6055',
  },
  participantPresentStatus: {
    color: '#60665B',
  },
  participantTextWrap: {
    flex: 1,
    gap: 2,
  },
  quoteBlock: {
    opacity: 0.62,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  quoteText: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '400',
    lineHeight: 22,
    textAlign: 'center',
  },
  safeArea: {
    flex: 1,
  },
  screen: {
    backgroundColor: Colors.dark.background,
    flex: 1,
  },
  sessionDetail: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    textAlign: 'center',
  },
  sessionEyebrow: {
    color: '#5A6055',
    fontFamily: Fonts.bodyMedium,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  sessionTitle: {
    color: Colors.dark.accent,
    fontFamily: Fonts.display,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 42,
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
  topBarTitle: {
    color: Colors.dark.accent,
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
});
