import * as SecureStore from 'expo-secure-store';

import type { ActivitySelectionResult } from '@/modules/expo-lovelock-shield';

const KEY = 'lovelock.activity-selection-summary';

export async function readPersistedActivitySelection(): Promise<ActivitySelectionResult | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as ActivitySelectionResult;
  } catch {
    return null;
  }
}

export async function writePersistedActivitySelection(summary: ActivitySelectionResult) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(summary));
}

export function lockedAppLabelsFromSummary(summary: ActivitySelectionResult): string[] {
  const labels: string[] = [];
  if (summary.applicationCount > 0) {
    labels.push(
      `${summary.applicationCount} app${summary.applicationCount === 1 ? '' : 's'}`
    );
  }
  if (summary.categoryCount > 0) {
    labels.push(
      `${summary.categoryCount} categor${summary.categoryCount === 1 ? 'y' : 'ies'}`
    );
  }
  if (summary.webDomainCount > 0) {
    labels.push(`${summary.webDomainCount} site${summary.webDomainCount === 1 ? '' : 's'}`);
  }
  if (labels.length === 0) {
    labels.push('Screen Time selection');
  }
  return labels;
}
