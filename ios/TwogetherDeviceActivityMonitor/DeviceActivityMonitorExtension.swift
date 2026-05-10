import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings

private enum StorageKeys {
  static let selectionData = "lovelock.selection.data"
  static let shieldState = "lovelock.shield.state"
}

class DeviceActivityMonitorExtension: DeviceActivityMonitor {
  private let managedStore = ManagedSettingsStore(named: .init("Lovelock"))

  private lazy var sharedDefaults: UserDefaults = {
    if let appGroup = Bundle.main.object(forInfoDictionaryKey: "LovelockAppGroupIdentifier") as? String,
       let defaults = UserDefaults(suiteName: appGroup) {
      return defaults
    }

    return .standard
  }()

  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)

    guard let selection = readSelection(), selectionHasTargets(selection) else {
      writeShieldState("interrupted")
      return
    }

    applyRestrictions(selection: selection)
    writeShieldState("active")
  }

  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)

    managedStore.clearAllSettings()
    writeShieldState("completed")
  }

  private func readSelection() -> FamilyActivitySelection? {
    guard let data = sharedDefaults.data(forKey: StorageKeys.selectionData) else {
      return nil
    }

    return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
  }

  private func selectionHasTargets(_ selection: FamilyActivitySelection) -> Bool {
    !selection.applicationTokens.isEmpty ||
      !selection.categoryTokens.isEmpty ||
      !selection.webDomainTokens.isEmpty
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

  private func writeShieldState(_ state: String) {
    sharedDefaults.set(state, forKey: StorageKeys.shieldState)
  }
}
