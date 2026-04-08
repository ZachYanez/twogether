import type { DashboardData, Session } from '@/src/lib/twogether-types';

type DashboardSource = {
  authorizationStatus: string;
  selectionConfigured: boolean;
  coupleReady: boolean;
  localShieldState: string;
  sessions: Session[];
  streak: DashboardData['streak'];
};

function wait(ms = 180) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchDashboard(source: DashboardSource): Promise<DashboardData> {
  await wait();

  const primarySession =
    source.sessions.find((session) => session.status === 'active') ??
    source.sessions.find((session) => session.status === 'armed') ??
    source.sessions.find((session) => session.status === 'pending_acceptance') ??
    null;

  const steps = [
    {
      id: 'pair',
      label: 'Partner paired',
      complete: source.coupleReady,
    },
    {
      id: 'authorize',
      label: 'Screen Time approved',
      complete: source.authorizationStatus === 'approved',
    },
    {
      id: 'selection',
      label: 'Restriction selection saved',
      complete: source.selectionConfigured,
    },
    {
      id: 'shield',
      label: 'Device ready to enforce',
      complete: ['armed', 'active', 'completed'].includes(source.localShieldState),
    },
  ];

  const score = steps.filter((step) => step.complete).length * 25;

  return {
    readiness: {
      score,
      headline:
        score === 100
          ? 'Both phones are ready for the next session.'
          : 'There is still setup work before Twogether can shield apps on-device.',
      body:
        score === 100
          ? 'The shared session can arm locally on each iPhone and activate at the scheduled interval.'
          : 'Twogether coordinates the agreement remotely, but each device must be individually authorized and configured.',
      steps,
    },
    primarySession,
    pendingSessionCount: source.sessions.filter(
      (session) => session.status === 'pending_acceptance'
    ).length,
    streak: source.streak,
  };
}

export async function fetchSessionFeed(sessions: Session[]) {
  await wait(140);
  return sessions
    .filter((session) => session.status !== 'cancelled')
    .sort(
      (left, right) =>
        new Date(left.scheduledStartAt).getTime() - new Date(right.scheduledStartAt).getTime()
    );
}

export async function fetchHistoryFeed(sessions: Session[], search: string) {
  await wait(120);
  const history = sessions
    .filter((session) => ['completed', 'interrupted'].includes(session.status))
    .sort(
      (left, right) =>
        new Date(right.scheduledStartAt).getTime() - new Date(left.scheduledStartAt).getTime()
    );

  if (!search.trim()) {
    return history;
  }

  const normalized = search.trim().toLowerCase();
  return history.filter((session) => session.title.toLowerCase().includes(normalized));
}
