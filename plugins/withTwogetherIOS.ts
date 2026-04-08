import {
  createRunOncePlugin,
  type ConfigPlugin,
  withEntitlementsPlist,
  withInfoPlist,
} from 'expo/config-plugins';

type PluginProps = {
  appGroup?: string;
  apsEnvironment?: 'development' | 'production';
  extensionBundleIdentifier?: string;
};

const withTwogetherIOS: ConfigPlugin<PluginProps> = (config, props = {}) => {
  const appGroup = props.appGroup ?? 'group.com.twogether.shared';
  const apsEnvironment = props.apsEnvironment ?? 'development';
  const extensionBundleIdentifier =
    props.extensionBundleIdentifier ?? 'com.twogether.app.DeviceActivityMonitor';

  config = withEntitlementsPlist(config, (entitlementsConfig) => {
    const existingGroups = Array.isArray(
      entitlementsConfig.modResults['com.apple.security.application-groups']
    )
      ? entitlementsConfig.modResults['com.apple.security.application-groups']
      : [];

    entitlementsConfig.modResults['com.apple.security.application-groups'] = Array.from(
      new Set([...existingGroups, appGroup])
    );
    entitlementsConfig.modResults['aps-environment'] = apsEnvironment;
    entitlementsConfig.modResults['com.apple.developer.family-controls'] = true;
    entitlementsConfig.modResults['com.apple.developer.applesignin'] = ['Default'];

    return entitlementsConfig;
  });

  config = withInfoPlist(config, (infoConfig) => {
    const backgroundModes = Array.isArray(infoConfig.modResults.UIBackgroundModes)
      ? infoConfig.modResults.UIBackgroundModes
      : [];

    infoConfig.modResults.UIBackgroundModes = Array.from(
      new Set([...backgroundModes, 'remote-notification'])
    );
    infoConfig.modResults.TwogetherAppGroupIdentifier = appGroup;
    infoConfig.modResults.TwogetherDeviceActivityExtensionBundleIdentifier =
      extensionBundleIdentifier;
    infoConfig.modResults.TwogetherRequiresDevelopmentBuild = true;

    return infoConfig;
  });

  return config;
};

export default createRunOncePlugin(withTwogetherIOS, 'withTwogetherIOS', '1.0.0');
