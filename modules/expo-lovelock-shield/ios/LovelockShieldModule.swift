import DeviceActivity
import ExpoModulesCore
import FamilyControls
import Foundation
import ManagedSettings
import SwiftUI

private enum StorageKeys {
  static let authorizationStatus = "lovelock.authorization.status"
  static let selectionConfigured = "lovelock.selection.configured"
  static let selectionData = "lovelock.selection.data"
  static let selectionApplicationCount = "lovelock.selection.application.count"
  static let selectionCategoryCount = "lovelock.selection.category.count"
  static let selectionWebDomainCount = "lovelock.selection.webDomain.count"
  static let shieldState = "lovelock.shield.state"
  static let scheduledSessions = "lovelock.scheduled.sessions"
  static let currentSessionId = "lovelock.current.session.id"
}

private struct ScheduledSession: Codable {
  let sessionId: String
  let startISO: String
  let endISO: String
}

private struct SelectionResult {
  let selectionConfigured: Bool
  let applicationCount: Int
  let categoryCount: Int
  let webDomainCount: Int

  var dictionary: [String: Any] {
    [
      "selectionConfigured": selectionConfigured,
      "applicationCount": applicationCount,
      "categoryCount": categoryCount,
      "webDomainCount": webDomainCount
    ]
  }
}

private final class LovelockShieldException: GenericException<String> {
  override var reason: String {
    param
  }
}

@available(iOS 16.0, *)
private struct LovelockActivityPickerView: View {
  @Environment(\.dismiss) private var dismiss
  @State private var selection: FamilyActivitySelection
  @State private var completed = false

  let onComplete: (FamilyActivitySelection) -> Void
  let onCancel: () -> Void

  init(
    selection: FamilyActivitySelection,
    onComplete: @escaping (FamilyActivitySelection) -> Void,
    onCancel: @escaping () -> Void
  ) {
    _selection = State(initialValue: selection)
    self.onComplete = onComplete
    self.onCancel = onCancel
  }

  var body: some View {
    NavigationView {
      FamilyActivityPicker(selection: $selection)
        .navigationTitle("Choose apps")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .cancellationAction) {
            Button("Cancel") {
              completed = true
              onCancel()
              dismiss()
            }
          }
          ToolbarItem(placement: .confirmationAction) {
            Button("Done") {
              completed = true
              onComplete(selection)
              dismiss()
            }
          }
        }
        .onDisappear {
          if !completed {
            completed = true
            onCancel()
          }
        }
    }
  }
}

public class LovelockShieldModule: Module {
  private let managedStore = ManagedSettingsStore(named: .init("Lovelock"))
  private let activityCenter = DeviceActivityCenter()
  private var pickerPromise: Promise?

  private lazy var sharedDefaults: UserDefaults = {
    if let appGroup = Bundle.main.object(forInfoDictionaryKey: "LovelockAppGroupIdentifier") as? String,
       let defaults = UserDefaults(suiteName: appGroup) {
      return defaults
    }

    return .standard
  }()

  public func definition() -> ModuleDefinition {
    Name("LovelockShield")

    Events(
      "authorizationStatusChanged",
      "shieldStateChanged",
      "sessionIntervalDidStart",
      "sessionIntervalDidEnd",
      "nativeError"
    )

    AsyncFunction("getAuthorizationStatus") { () -> String in
      let status = self.authorizationStatusString()
      self.sharedDefaults.set(status, forKey: StorageKeys.authorizationStatus)
      return status
    }

    AsyncFunction("requestAuthorization") { () async throws -> String in
      guard #available(iOS 16.0, *) else {
        throw LovelockShieldException("Screen Time authorization requires iOS 16 or newer.")
      }

      try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
      let status = self.authorizationStatusString()
      self.sharedDefaults.set(status, forKey: StorageKeys.authorizationStatus)
      self.sendEvent("authorizationStatusChanged", [
        "status": status
      ])
      return status
    }

    AsyncFunction("presentActivityPicker") { (promise: Promise) in
      guard #available(iOS 16.0, *) else {
        promise.reject(LovelockShieldException("The Screen Time activity picker requires iOS 16 or newer."))
        return
      }

      DispatchQueue.main.async {
        guard self.pickerPromise == nil else {
          promise.reject(LovelockShieldException("The activity picker is already open."))
          return
        }

        guard let presenter = self.appContext?.utilities?.currentViewController() else {
          promise.reject(LovelockShieldException("Could not find a view controller to present the activity picker."))
          return
        }

        self.pickerPromise = promise
        let view = LovelockActivityPickerView(
          selection: self.readSelection() ?? FamilyActivitySelection(),
          onComplete: { selection in
            do {
              let result = try self.writeSelection(selection)
              self.pickerPromise?.resolve(result.dictionary)
            } catch {
              self.pickerPromise?.reject(LovelockShieldException(error.localizedDescription))
            }
            self.pickerPromise = nil
          },
          onCancel: {
            self.pickerPromise?.resolve([
              "selectionConfigured": self.hasUsableSelection(),
              "applicationCount": self.sharedDefaults.integer(forKey: StorageKeys.selectionApplicationCount),
              "categoryCount": self.sharedDefaults.integer(forKey: StorageKeys.selectionCategoryCount),
              "webDomainCount": self.sharedDefaults.integer(forKey: StorageKeys.selectionWebDomainCount)
            ])
            self.pickerPromise = nil
          }
        )

        let controller = UIHostingController(rootView: view)
        presenter.present(controller, animated: true)
      }
    }

    AsyncFunction("hasStoredSelection") { () -> Bool in
      self.hasUsableSelection()
    }

    AsyncFunction("clearStoredSelection") {
      self.sharedDefaults.removeObject(forKey: StorageKeys.selectionData)
      self.sharedDefaults.set(false, forKey: StorageKeys.selectionConfigured)
      self.sharedDefaults.set(0, forKey: StorageKeys.selectionApplicationCount)
      self.sharedDefaults.set(0, forKey: StorageKeys.selectionCategoryCount)
      self.sharedDefaults.set(0, forKey: StorageKeys.selectionWebDomainCount)
      self.clearRestrictions()
    }

    AsyncFunction("applyRestrictionsNow") {
      guard let selection = self.readSelection(), self.selectionHasTargets(selection) else {
        self.sendEvent("nativeError", [
          "message": "No local Screen Time selection is configured.",
          "code": "missing_selection"
        ])
        self.writeShieldState("interrupted")
        return
      }

      self.applyRestrictions(selection: selection)
      self.writeShieldState("active")
      self.sendEvent("sessionIntervalDidStart", [
        "sessionId": self.sharedDefaults.string(forKey: StorageKeys.currentSessionId) ?? "manual"
      ])
    }

    AsyncFunction("clearRestrictionsNow") {
      self.clearRestrictions()
      self.writeShieldState("completed")
      self.sendEvent("sessionIntervalDidEnd", [
        "sessionId": self.sharedDefaults.string(forKey: StorageKeys.currentSessionId) ?? "manual"
      ])
    }

    AsyncFunction("scheduleSession") { (sessionId: String, startISO: String, endISO: String) in
      guard self.hasUsableSelection() else {
        throw LovelockShieldException("No local Screen Time selection is configured.")
      }

      let schedule = try self.makeSchedule(startISO: startISO, endISO: endISO)
      let activityName = self.activityName(for: sessionId)

      do {
        try self.activityCenter.startMonitoring(activityName, during: schedule)
      } catch {
        throw LovelockShieldException(error.localizedDescription)
      }

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
      self.activityCenter.stopMonitoring([self.activityName(for: sessionId)])
      let sessions = self.readScheduledSessions().filter { $0.sessionId != sessionId }
      self.writeScheduledSessions(sessions)

      if self.sharedDefaults.string(forKey: StorageKeys.currentSessionId) == sessionId {
        self.sharedDefaults.removeObject(forKey: StorageKeys.currentSessionId)
      }
    }

    AsyncFunction("getLocalShieldState") { () -> String in
      self.sharedDefaults.string(forKey: StorageKeys.shieldState) ?? "idle"
    }

    AsyncFunction("getActivitySelectionSummary") { () -> [String: Any] in
      [
        "selectionConfigured": self.sharedDefaults.bool(forKey: StorageKeys.selectionConfigured),
        "applicationCount": self.sharedDefaults.integer(forKey: StorageKeys.selectionApplicationCount),
        "categoryCount": self.sharedDefaults.integer(forKey: StorageKeys.selectionCategoryCount),
        "webDomainCount": self.sharedDefaults.integer(forKey: StorageKeys.selectionWebDomainCount)
      ]
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

  private func authorizationStatusString() -> String {
    let status = AuthorizationCenter.shared.authorizationStatus

    if #available(iOS 26.4, *), status == .approvedWithDataAccess {
      return "approved"
    }

    switch status {
    case .notDetermined:
      return "notDetermined"
    case .denied:
      return "denied"
    case .approved:
      return "approved"
    @unknown default:
      return "unknown"
    }
  }

  private func readSelection() -> FamilyActivitySelection? {
    guard let data = sharedDefaults.data(forKey: StorageKeys.selectionData) else {
      return nil
    }

    return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
  }

  private func writeSelection(_ selection: FamilyActivitySelection) throws -> SelectionResult {
    let result = SelectionResult(
      selectionConfigured: selectionHasTargets(selection),
      applicationCount: selection.applicationTokens.count,
      categoryCount: selection.categoryTokens.count,
      webDomainCount: selection.webDomainTokens.count
    )

    let data = try JSONEncoder().encode(selection)
    sharedDefaults.set(data, forKey: StorageKeys.selectionData)
    sharedDefaults.set(result.selectionConfigured, forKey: StorageKeys.selectionConfigured)
    sharedDefaults.set(result.applicationCount, forKey: StorageKeys.selectionApplicationCount)
    sharedDefaults.set(result.categoryCount, forKey: StorageKeys.selectionCategoryCount)
    sharedDefaults.set(result.webDomainCount, forKey: StorageKeys.selectionWebDomainCount)

    return result
  }

  private func selectionHasTargets(_ selection: FamilyActivitySelection) -> Bool {
    !selection.applicationTokens.isEmpty ||
      !selection.categoryTokens.isEmpty ||
      !selection.webDomainTokens.isEmpty
  }

  private func hasUsableSelection() -> Bool {
    guard let selection = readSelection() else {
      return false
    }

    return selectionHasTargets(selection)
  }

  private func applyRestrictions(selection: FamilyActivitySelection) {
    managedStore.shield.applications =
      selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
    managedStore.shield.webDomains =
      selection.webDomainTokens.isEmpty ? nil : selection.webDomainTokens
    managedStore.shield.applicationCategories =
      selection.categoryTokens.isEmpty ? nil : .specific(selection.categoryTokens)
    managedStore.shield.webDomainCategories =
      selection.categoryTokens.isEmpty ? nil : .specific(selection.categoryTokens)
  }

  private func clearRestrictions() {
    managedStore.clearAllSettings()
  }

  private func makeSchedule(startISO: String, endISO: String) throws -> DeviceActivitySchedule {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

    let startDate = formatter.date(from: startISO) ?? ISO8601DateFormatter().date(from: startISO)
    let endDate = formatter.date(from: endISO) ?? ISO8601DateFormatter().date(from: endISO)

    guard let startDate, let endDate, endDate > startDate else {
      throw LovelockShieldException("Session start and end times are invalid.")
    }

    let calendar = Calendar.current
    let components: Set<Calendar.Component> = [.year, .month, .day, .hour, .minute, .second]

    return DeviceActivitySchedule(
      intervalStart: calendar.dateComponents(components, from: startDate),
      intervalEnd: calendar.dateComponents(components, from: endDate),
      repeats: false
    )
  }

  private func activityName(for sessionId: String) -> DeviceActivityName {
    DeviceActivityName("lovelock.\(sessionId)")
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
