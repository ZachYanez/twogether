import type { ExpoConfig } from 'expo/config';

const bundleIdentifier = 'com.twogether.app';
const appGroup = 'group.com.twogether.shared';
const extensionBundleIdentifier = `${bundleIdentifier}.DeviceActivityMonitor`;
const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
const revenueCatAppleApiKey = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY;
const revenueCatEntitlementId = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID;
const revenueCatOfferingId = process.env.EXPO_PUBLIC_REVENUECAT_OFFERING_ID;

const plugins: NonNullable<ExpoConfig['plugins']> = [
  'expo-router',
  'expo-dev-client',
  'expo-apple-authentication',
  [
    'expo-location',
    {
      locationWhenInUsePermission:
        'Twogether uses your location to detect when you are at a saved place with your partner.',
    },
  ],
];

if (googleIosUrlScheme) {
  plugins.push([
    '@react-native-google-signin/google-signin',
    {
      iosUrlScheme: googleIosUrlScheme,
    },
  ]);
}

plugins.push(
  [
    'expo-notifications',
    {
      icon: './assets/images/icon.png',
      color: '#5D1A1A',
    },
  ],
  [
    './plugins/withTwogetherIOS',
    {
      appGroup,
      apsEnvironment: 'development',
      extensionBundleIdentifier,
    },
  ]
);

const config: ExpoConfig = {
  name: 'Twogether',
  slug: 'twogether',
  version: '1.0.0',
  scheme: 'twogether',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  icon: './assets/images/icon.png',
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#F2EFEB',
  },
  ios: {
    bundleIdentifier,
    supportsTablet: false,
    usesAppleSignIn: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Twogether uses your location to detect when you are at a saved place with your partner.',
      UIViewControllerBasedStatusBarAppearance: false,
    },
  },
  plugins,
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    api: {
      baseUrl: apiBaseUrl,
    },
    supabase: {
      url: supabaseUrl,
      publishableKey: supabasePublishableKey,
    },
    auth: {
      apiBaseUrl,
      googleIosClientId,
      googleWebClientId,
      googleIosUrlScheme,
    },
    revenueCat: {
      appleApiKey: revenueCatAppleApiKey,
      entitlementIdentifier: revenueCatEntitlementId,
      offeringIdentifier: revenueCatOfferingId,
    },
    twogether: {
      appGroup,
      extensionBundleIdentifier,
    },
  },
};

export default config;
