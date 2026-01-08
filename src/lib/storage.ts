import { UserSettings, IQResult, DEFAULT_SETTINGS } from '../types';

const SETTINGS_KEY = 'xiq_settings';
const IQ_CACHE_KEY = 'xiq_cache';

export async function getSettings(): Promise<UserSettings> {
  const result = await chrome.storage.sync.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...result[SETTINGS_KEY] };
}

export async function saveSettings(settings: Partial<UserSettings>): Promise<void> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await chrome.storage.sync.set({ [SETTINGS_KEY]: updated });
}

export async function getIQCache(): Promise<Map<string, IQResult>> {
  const result = await chrome.storage.local.get(IQ_CACHE_KEY);
  const data = result[IQ_CACHE_KEY] || {};
  return new Map(Object.entries(data));
}

export async function saveIQResult(result: IQResult): Promise<void> {
  const cache = await getIQCache();
  cache.set(result.screenName, result);
  await chrome.storage.local.set({ 
    [IQ_CACHE_KEY]: Object.fromEntries(cache) 
  });
}

export async function saveIQResults(results: IQResult[]): Promise<void> {
  const cache = await getIQCache();
  for (const result of results) {
    cache.set(result.screenName, result);
  }
  await chrome.storage.local.set({ 
    [IQ_CACHE_KEY]: Object.fromEntries(cache) 
  });
}

export async function getCachedIQ(screenName: string): Promise<IQResult | null> {
  const cache = await getIQCache();
  return cache.get(screenName) || null;
}

export async function getAverageIQ(): Promise<number | null> {
  const cache = await getIQCache();
  if (cache.size === 0) return null;
  
  const scores = Array.from(cache.values()).map(r => r.iq);
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export async function getIQStats(): Promise<{ average: number | null; count: number }> {
  const cache = await getIQCache();
  if (cache.size === 0) return { average: null, count: 0 };
  
  const scores = Array.from(cache.values()).map(r => r.iq);
  const average = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  return { average, count: cache.size };
}
