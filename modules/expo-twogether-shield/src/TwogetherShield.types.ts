export type TwogetherShieldModuleEvents = {
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
