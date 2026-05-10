import ExpoModulesCore
import Foundation

private enum StorageKeys {
  static let authorizationStatus = "twogether.authorization.status"
  static let selectionConfigured = "twogether.selection.configured"
  static let shieldState = "twogether.shield.state"
  static let scheduledSessions = "twogether.scheduled.sessions"
  static let currentSessionId = "twogether.current.session.id"
}

private struct ScheduledSession: Codable {
  let sessionId: String
  let startISO: String
  let endISO: String
}

public class TwogetherShieldModule: Module {
  private lazy var sharedDefaults: UserDefaults = {
    if let appGroup = Bundle.main.object(forInfoDictionaryKey: "TwogetherAppGroupIdentifier") as? String,
       let defaults = UserDefaults(suiteName: appGroup) {
      return defaults
    }

    return .standard
  }()

  public func definition() -> ModuleDefinition {
    Name("TwogetherShield")

    Events(
      "authorizationStatusChanged",
      "shieldStateChanged",
      "sessionIntervalDidStart",
      "sessionIntervalDidEnd",
      "nativeError"
    )

    AsyncFunction("getAuthorizationStatus") { () -> String in
      self.sharedDefaults.string(forKey: StorageKeys.authorizationStatus) ?? "notDetermined"
    }

    AsyncFunction("requestAuthorization") { () -> String in
      let status = "approved"
      self.sharedDefaults.set(status, forKey: StorageKeys.authorizationStatus)
      self.sendEvent("authorizationStatusChanged", [
        "status": status
      ])
      return status
    }

    AsyncFunction("presentActivityPicker") { () -> [String: Bool] in
      self.sharedDefaults.set(true, forKey: StorageKeys.selectionConfigured)
      return [
        "selectionConfigured": true
      ]
    }

    AsyncFunction("hasStoredSelection") { () -> Bool in
      self.sharedDefaults.bool(forKey: StorageKeys.selectionConfigured)
    }

    AsyncFunction("clearStoredSelection") {
      self.sharedDefaults.set(false, forKey: StorageKeys.selectionConfigured)
    }

    AsyncFunction("applyRestrictionsNow") {
      guard self.sharedDefaults.bool(forKey: StorageKeys.selectionConfigured) else {
        self.sendEvent("nativeError", [
          "message": "No local Screen Time selection is configured.",
          "code": "missing_selection"
        ])
        self.writeShieldState("interrupted")
        return
      }

      self.writeShieldState("active")
      self.sendEvent("sessionIntervalDidStart", [
        "sessionId": self.sharedDefaults.string(forKey: StorageKeys.currentSessionId) ?? "manual"
      ])
    }

    AsyncFunction("clearRestrictionsNow") {
      self.writeShieldState("completed")
      self.sendEvent("sessionIntervalDidEnd", [
        "sessionId": self.sharedDefaults.string(forKey: StorageKeys.currentSessionId) ?? "manual"
      ])
    }

    AsyncFunction("scheduleSession") { (sessionId: String, startISO: String, endISO: String) in
      var sessions = self.readScheduledSessions()
      sessions.removeAll { $0.sessionId == sessionId }
      sessions.append(
        ScheduledSession(
          sessionId: sessionId,
          startISO: startISO,
          endISO: endISO
        )
      )

      self.writeScheduledSessions(sessions)
      self.sharedDefaults.set(sessionId, forKey: StorageKeys.currentSessionId)
      self.writeShieldState("armed")
    }

    AsyncFunction("cancelScheduledSession") { (sessionId: String) in
      let sessions = self.readScheduledSessions().filter { $0.sessionId != sessionId }
      self.writeScheduledSessions(sessions)

      if self.sharedDefaults.string(forKey: StorageKeys.currentSessionId) == sessionId {
        self.sharedDefaults.removeObject(forKey: StorageKeys.currentSessionId)
      }
    }

    AsyncFunction("getLocalShieldState") { () -> String in
      self.sharedDefaults.string(forKey: StorageKeys.shieldState) ?? "idle"
    }

    AsyncFunction("getScheduledSessions") { () -> [[String: String]] in
      self.readScheduledSessions().map { session in
        [
          "sessionId": session.sessionId,
          "startISO": session.startISO,
          "endISO": session.endISO
        ]
      }
    }
  }

  private func readScheduledSessions() -> [ScheduledSession] {
    guard let data = sharedDefaults.data(forKey: StorageKeys.scheduledSessions) else {
      return []
    }

    do {
      return try JSONDecoder().decode([ScheduledSession].self, from: data)
    } catch {
      sendEvent("nativeError", [
        "message": "Could not decode scheduled sessions from shared storage.",
        "code": "decode_failed"
      ])
      return []
    }
  }

  private func writeScheduledSessions(_ sessions: [ScheduledSession]) {
    do {
      let data = try JSONEncoder().encode(sessions)
      sharedDefaults.set(data, forKey: StorageKeys.scheduledSessions)
    } catch {
      sendEvent("nativeError", [
        "message": "Could not encode scheduled sessions for shared storage.",
        "code": "encode_failed"
      ])
    }
  }

  private func writeShieldState(_ state: String) {
    sharedDefaults.set(state, forKey: StorageKeys.shieldState)
    sendEvent("shieldStateChanged", [
      "shieldState": state
    ])
  }
}
