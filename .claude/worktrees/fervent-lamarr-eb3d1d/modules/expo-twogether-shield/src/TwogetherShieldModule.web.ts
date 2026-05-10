import { NativeModule, registerWebModule } from 'expo';

import type {
  ScheduledNativeSession,
  TwogetherShieldModuleEvents,
} from './TwogetherShield.types';

type WebState = {
  authorizationStatus: string;
  selectionConfigured: boolean;
  shieldState: string;
  scheduledSessions: ScheduledNativeSession[];
  currentSessionId: string;
};

const storageKey = 'twogether-shield-state';

function getFallbackState(): WebState {
  return {
    authorizationStatus: 'notDetermined',
    selectionConfigured: false,
    shieldState: 'idle',
    scheduledSessions: [],
    currentSessionId: '',
  };
}

function loadState(): WebState {
  if (typeof localStorage === 'undefined') {
    return getFallbackState();
  }

  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return getFallbackState();
  }

  try {
    return {
      ...getFallbackState(),
      ...(JSON.parse(raw) as Partial<WebState>),
    };
  } catch {
    return getFallbackState();
  }
}

function saveState(state: WebState) {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(storageKey, JSON.stringify(state));
}

class TwogetherShieldModule extends NativeModule<TwogetherShieldModuleEvents> {
  private state = loadState();

  private persist(next: Partial<WebState>) {
    this.state = {
      ...this.state,
      ...next,
    };

    saveState(this.state);
  }

  async getAuthorizationStatus(): Promise<string> {
    return this.state.authorizationStatus;
  }

  async requestAuthorization(): Promise<string> {
    this.persist({ authorizationStatus: 'approved' });
    this.emit('authorizationStatusChanged', { status: 'approved' });
    return 'approved';
  }

  async presentActivityPicker(): Promise<{ selectionConfigured: boolean }> {
    this.persist({ selectionConfigured: true });
    return { selectionConfigured: true };
  }

  async hasStoredSelection(): Promise<boolean> {
    return this.state.selectionConfigured;
  }

  async clearStoredSelection(): Promise<void> {
    this.persist({ selectionConfigured: false });
  }

  async applyRestrictionsNow(): Promise<void> {
    this.persist({ shieldState: 'active' });
    this.emit('shieldStateChanged', { shieldState: 'active' });
    this.emit('sessionIntervalDidStart', { sessionId: this.state.currentSessionId || 'manual' });
  }

  async clearRestrictionsNow(): Promise<void> {
    this.persist({ shieldState: 'completed' });
    this.emit('shieldStateChanged', { shieldState: 'completed' });
    this.emit('sessionIntervalDidEnd', { sessionId: this.state.currentSessionId || 'manual' });
  }

  async scheduleSession(sessionId: string, startISO: string, endISO: string): Promise<void> {
    const sessions = this.state.scheduledSessions.filter(
      (session) => session.sessionId !== sessionId
    );

    sessions.push({
      sessionId,
      startISO,
      endISO,
    });

    this.persist({
      currentSessionId: sessionId,
      scheduledSessions: sessions,
      shieldState: 'armed',
    });
    this.emit('shieldStateChanged', { shieldState: 'armed' });
  }

  async cancelScheduledSession(sessionId: string): Promise<void> {
    this.persist({
      scheduledSessions: this.state.scheduledSessions.filter(
        (session) => session.sessionId !== sessionId
      ),
    });
  }

  async getLocalShieldState(): Promise<string> {
    return this.state.shieldState;
  }

  async getScheduledSessions(): Promise<ScheduledNativeSession[]> {
    return this.state.scheduledSessions;
  }
}

export default registerWebModule(TwogetherShieldModule, 'TwogetherShieldModule');
