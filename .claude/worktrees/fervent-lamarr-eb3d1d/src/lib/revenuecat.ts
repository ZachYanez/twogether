import Constants from 'expo-constants';
import Purchases from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';
import { Linking, Platform } from 'react-native';

import type {
  SubscriptionPackageOption,
  SubscriptionSnapshot,
} from '@/src/lib/twogether-types';

type RevenueCatExtra = {
  revenueCat?: {
    appleApiKey?: string;
    entitlementIdentifier?: string;
    offeringIdentifier?: string;
  };
  twogether?: {
    appGroup?: string;
  };
};

type RevenueCatConfig = {
  appleApiKey: string;
  entitlementIdentifier: string;
  offeringIdentifier?: string;
  appGroup?: string;
};

let configuredUserId: string | null = null;
let didConfigure = false;

function emptySnapshot(
  status: SubscriptionSnapshot['status'],
  error: string | null = null
): SubscriptionSnapshot {
  return {
    status,
    packages: [],
    offeringIdentifier: null,
    activeEntitlementIdentifier: null,
    managementUrl: null,
    expiresAt: null,
    willRenew: false,
    unsubscribeDetectedAt: null,
    billingIssueDetectedAt: null,
    appUserId: null,
    hasIntroOfferConfigured: false,
    error,
  };
}

function getRevenueCatConfig(): RevenueCatConfig | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as RevenueCatExtra;
  const appleApiKey = extra.revenueCat?.appleApiKey?.trim();
  const entitlementIdentifier = extra.revenueCat?.entitlementIdentifier?.trim();

  if (!appleApiKey || !entitlementIdentifier) {
    return null;
  }

  return {
    appleApiKey,
    entitlementIdentifier,
    offeringIdentifier: extra.revenueCat?.offeringIdentifier?.trim() || undefined,
    appGroup: extra.twogether?.appGroup?.trim() || undefined,
  };
}

function packageTypeLabel(packageType: string) {
  return packageType.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (char) => char.toUpperCase());
}

function mapPackageOption(aPackage: {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    title: string;
    description: string;
    price: number;
    priceString: string;
    pricePerMonthString: string | null;
    subscriptionPeriod: string | null;
    introPrice: unknown;
  };
}): SubscriptionPackageOption {
  return {
    packageIdentifier: aPackage.identifier,
    packageType: packageTypeLabel(aPackage.packageType),
    productIdentifier: aPackage.product.identifier,
    title: aPackage.product.title,
    description: aPackage.product.description,
    price: aPackage.product.price,
    priceString: aPackage.product.priceString,
    pricePerMonthString: aPackage.product.pricePerMonthString,
    subscriptionPeriod: aPackage.product.subscriptionPeriod,
    hasIntroOffer: Boolean(aPackage.product.introPrice),
  };
}

async function ensureConfigured(appUserId: string): Promise<RevenueCatConfig> {
  const config = getRevenueCatConfig();

  if (Platform.OS !== 'ios') {
    throw new Error('RevenueCat subscriptions are only enabled for iOS in this MVP.');
  }

  if (!config) {
    throw new Error(
      'Missing RevenueCat configuration. Set EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY and EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID.'
    );
  }

  if (!didConfigure) {
    Purchases.configure({
      apiKey: config.appleApiKey,
      appUserID: appUserId,
      userDefaultsSuiteName: config.appGroup,
    });
    configuredUserId = appUserId;
    didConfigure = true;
    return config;
  }

  if (configuredUserId !== appUserId) {
    await Purchases.logIn(appUserId);
    configuredUserId = appUserId;
  }

  return config;
}

async function getOffering(config: RevenueCatConfig) {
  const offerings = await Purchases.getOfferings();

  if (config.offeringIdentifier) {
    return offerings.all[config.offeringIdentifier] ?? offerings.current;
  }

  return offerings.current;
}

async function buildSnapshot(config: RevenueCatConfig): Promise<SubscriptionSnapshot> {
  const [customerInfo, appUserId, offering] = await Promise.all([
    Purchases.getCustomerInfo(),
    Purchases.getAppUserID(),
    getOffering(config),
  ]);
  const entitlement =
    customerInfo.entitlements.all[config.entitlementIdentifier] ??
    customerInfo.entitlements.active[config.entitlementIdentifier] ??
    null;
  const packages = offering?.availablePackages.map(mapPackageOption) ?? [];

  return {
    status: entitlement?.isActive ? 'active' : 'inactive',
    packages,
    offeringIdentifier: offering?.identifier ?? null,
    activeEntitlementIdentifier: entitlement?.isActive ? entitlement.identifier : null,
    managementUrl: customerInfo.managementURL,
    expiresAt: entitlement?.expirationDate ?? null,
    willRenew: entitlement?.willRenew ?? false,
    unsubscribeDetectedAt: entitlement?.unsubscribeDetectedAt ?? null,
    billingIssueDetectedAt: entitlement?.billingIssueDetectedAt ?? null,
    appUserId,
    hasIntroOfferConfigured: packages.some((entry) => entry.hasIntroOffer),
    error: null,
  };
}

async function resolvePackage(config: RevenueCatConfig, packageIdentifier: string) {
  const offering = await getOffering(config);
  const aPackage = offering?.availablePackages.find(
    (candidate) => candidate.identifier === packageIdentifier
  );

  if (!aPackage) {
    throw new Error('The selected subscription package is no longer available.');
  }

  return aPackage;
}

export async function syncRevenueCatSubscription(
  appUserId: string
): Promise<SubscriptionSnapshot> {
  if (Platform.OS !== 'ios') {
    return emptySnapshot('unsupported', 'RevenueCat subscriptions are only supported on iOS.');
  }

  try {
    const config = await ensureConfigured(appUserId);
    return buildSnapshot(config);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'RevenueCat subscription state could not be loaded.';

    if (message.startsWith('Missing RevenueCat configuration')) {
      return emptySnapshot('configuration_required', message);
    }

    return emptySnapshot('error', message);
  }
}

export async function purchaseRevenueCatPackage(params: {
  appUserId: string;
  packageIdentifier: string;
}): Promise<SubscriptionSnapshot> {
  const config = await ensureConfigured(params.appUserId);
  const aPackage = await resolvePackage(config, params.packageIdentifier);
  const result = await Purchases.purchasePackage(aPackage);

  const refreshed = await buildSnapshot(config);

  return {
    ...refreshed,
    activeEntitlementIdentifier:
      refreshed.activeEntitlementIdentifier ?? config.entitlementIdentifier,
    appUserId: result.customerInfo.originalAppUserId || refreshed.appUserId,
  };
}

export async function restoreRevenueCatPurchases(
  appUserId: string
): Promise<SubscriptionSnapshot> {
  const config = await ensureConfigured(appUserId);
  await Purchases.restorePurchases();
  return buildSnapshot(config);
}

export async function presentRevenueCatCustomerCenter() {
  await RevenueCatUI.presentCustomerCenter();
}

export async function openRevenueCatManagementUrl(url: string | null) {
  if (!url) {
    throw new Error('No active App Store subscription management URL is available yet.');
  }

  await Linking.openURL(url);
}

export function resetRevenueCatSession() {
  configuredUserId = null;
}
