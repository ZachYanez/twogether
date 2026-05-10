import DeviceActivity
import ManagedSettings

final class DeviceActivityMonitorExtension: DeviceActivityMonitor {
  private let managedStore = ManagedSettingsStore(named: .init("Twogether"))

  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)

    // TODO:
    // 1. Read the stored FamilyActivitySelection token blob from the shared app group.
    // 2. Apply ManagedSettings shields for the selected applications, categories, and domains.
    // 3. Persist the active local shield state back into the app group so the main app can reconcile.
  }

  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)

    managedStore.clearAllSettings()

    // TODO:
    // 1. Mark the session as completed in shared storage.
    // 2. Record interruption or success metadata for foreground reconciliation and backend upload.
  }
}
