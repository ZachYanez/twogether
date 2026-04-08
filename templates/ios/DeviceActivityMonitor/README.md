# Device Activity Monitor Template

These files are intentionally kept outside the compiled Expo module target.

Use them when you add the real iOS `DeviceActivityMonitor` extension target during `expo prebuild`
or when you commit the generated `ios/` directory and wire the extension manually in Xcode.

Planned responsibilities:

- Observe scheduled start and end intervals.
- Apply and clear `ManagedSettings` shields using the locally stored Family Activity selection.
- Persist local shield-state transitions into the Twogether app group.
- Allow the main app to reconcile `active`, `completed`, or `interrupted` outcomes on next foreground.
