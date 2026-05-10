import type { ExpoConfig } from 'expo/config';

const bundleIdentifier = 'com.lovelock.app';
const appGroup = 'group.com.lovelock.shared';
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
    'expo-image-picker',
    {
      photosPermission:
        'Love Lock uses your photo library to let you choose a profile photo.',
      cameraPermission: false,
      microphonePermission: false,
    },
  ],
  [
    'expo-location',
    {
      locationWhenInUsePermission:
        'Love Lock uses your location to detect when you are at a saved place with your partner.',
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
    './plugins/withLovelockIOS',
    {
      appGroup,
      apsEnvironment: 'development',
      extensionBundleIdentifier,
    },
  ]
);

const config: ExpoConfig = {
  name: 'Love Lock',
  slug: 'love-lock',
  version: '1.0.0',
  scheme: 'lovelock',
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
        'Love Lock uses your location to detect when you are at a saved place with your partner.',
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
    lovelock: {
      appGroup,
      extensionBundleIdentifier,
    },
  },
};

export default config;
