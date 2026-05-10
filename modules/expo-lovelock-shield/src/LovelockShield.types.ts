export type LovelockShieldModuleEvents = {
  authorizationStatusChanged: (params: { status: string }) => void;
  shieldStateChanged: (params: { shieldState: string }) => void;
  sessionIntervalDidStart: (params: { sessionId: string }) => void;
  sessionIntervalDidEnd: (params: { sessionId: string }) => void;
  nativeError: (params: { message: string; code?: string }) => void;
};

export type ScheduledNativeSession = {
  sessionId: string;
  startISO: string;
  endISO: string;
};

export type ActivitySelectionResult = {
  selectionConfigured: boolean;
  applicationCount: number;
  categoryCount: number;
  webDomainCount: number;
};

/** Current Screen Time selection counts from on-device storage (no picker UI). */
export type ActivitySelectionSummary = ActivitySelectionResult;
