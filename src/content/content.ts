import type { UserSettings, UserData } from '../types';
import { getUserData } from '../lib/x';
import { extractScreenName, findAvatarContainer } from './dom';
import { getState, resetState, setLoading, setIQBadge, setError, setHidden } from './ui';

let settings: UserSettings | null = null;

interface CachedIQ {
  iq: number;
  reasoning?: string;
}

const iqCache = new Map<string, CachedIQ>();
const pendingUsers = new Map<string, { article: HTMLElement; avatarContainer: HTMLElement | null }>();
const inFlightUsers = new Set<string>();
const userDataQueue = new Map<string, UserData>();

const DEBOUNCE_MS = 150;
const BATCH_SIZE = 5;
const MAX_CONCURRENT_BATCHES = 2;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let activeBatches = 0;
let visibilityObserver: IntersectionObserver | null = null;

async function loadSettings() {
  try {
    settings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
  } catch {
    settings = null;
  }
}

function applyCachedIQ(article: HTMLElement, avatarContainer: HTMLElement | null, screenName: string): boolean {
  const cached = iqCache.get(screenName);
  if (cached !== undefined) {
    // Check if should hide
    if (settings?.hideLowIQ && cached.iq < (settings.iqThreshold || 100)) {
      setHidden(article, cached.iq, cached.reasoning);
    } else {
      setIQBadge(article, avatarContainer, cached.iq);
    }
    return true;
  }
  return false;
}

async function processBatch(batch: Array<[string, { article: HTMLElement; avatarContainer: HTMLElement | null }]>) {
  if (batch.length === 0) return;

  activeBatches++;
  console.log(`[x-iq] Processing batch of ${batch.length} users`);

  try {
    // Fetch user data for all users in parallel
    const fetchPromises = batch.map(async ([screenName]) => {
      // Check if we already have user data queued
      let userData = userDataQueue.get(screenName);
      
      if (!userData) {
        const fetchedData = await getUserData(screenName);
        if (fetchedData) {
          userData = {
            screenName,
            bio: fetchedData.bio,
            tweets: fetchedData.tweets
          };
          userDataQueue.set(screenName, userData);
        }
      }
      
      return userData;
    });

    const fetchedResults = await Promise.all(fetchPromises);
    const usersToAnalyze: UserData[] = fetchedResults.filter((u): u is UserData => u !== null && u !== undefined);

    console.log(`[x-iq] Fetched data for ${usersToAnalyze.length}/${batch.length} users`);

    if (usersToAnalyze.length === 0) {
      // No data to analyze, mark all as error
      console.warn('[x-iq] No user data fetched for batch');
      for (const [screenName, { article, avatarContainer }] of batch) {
        inFlightUsers.delete(screenName);
        setError(article, avatarContainer, 'Failed to fetch user data');
      }
      return;
    }

    // Send to background for LLM analysis
    const response = await chrome.runtime.sendMessage({
      type: 'ANALYZE_IQ',
      payload: { users: usersToAnalyze }
    });

    const results = response?.results as Record<string, { iq: number; reasoning?: string }> || {};
    const hideLowIQ = response?.hideLowIQ as boolean;
    const threshold = response?.threshold as number || 100;

    const resultsKeys = Object.keys(results);
    console.log('[x-iq] Results keys:', resultsKeys);
    console.log('[x-iq] Looking for:', batch.map(([sn]) => sn));

    // Build case-insensitive lookup
    const resultsLower: Record<string, { iq: number; reasoning?: string }> = {};
    for (const key of resultsKeys) {
      resultsLower[key.toLowerCase().replace(/^@/, '')] = results[key];
    }

    // Apply results
    for (const [screenName, { article, avatarContainer }] of batch) {
      const lookupKey = screenName.toLowerCase();
      const result = results[screenName] || resultsLower[lookupKey];
      
      if (result !== undefined) {
        iqCache.set(screenName, { iq: result.iq, reasoning: result.reasoning });
        
        // Check if should hide
        if (hideLowIQ && result.iq < threshold) {
          setHidden(article, result.iq, result.reasoning);
        } else {
          setIQBadge(article, avatarContainer, result.iq);
        }
      } else {
        setError(article, avatarContainer, 'No IQ result returned');
      }
      
      inFlightUsers.delete(screenName);
    }
  } catch (e) {
    console.error('[x-iq] Batch processing error:', e);
    // On error, mark all as done without badge
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    for (const [screenName, { article, avatarContainer }] of batch) {
      inFlightUsers.delete(screenName);
      setError(article, avatarContainer, errorMsg);
    }
  } finally {
    activeBatches--;
  }
}

function flushPending() {
  debounceTimer = null;

  if (pendingUsers.size === 0) return;

  const allPending = Array.from(pendingUsers.entries());
  pendingUsers.clear();

  const batches: Array<[string, { article: HTMLElement; avatarContainer: HTMLElement | null }]>[] = [];
  for (let i = 0; i < allPending.length; i += BATCH_SIZE) {
    batches.push(allPending.slice(i, i + BATCH_SIZE));
  }

  const processNext = () => {
    while (activeBatches < MAX_CONCURRENT_BATCHES && batches.length > 0) {
      const batch = batches.shift()!;
      processBatch(batch).then(() => {
        if (batches.length > 0) {
          processNext();
        }
      });
    }
  };

  processNext();
}

function scheduleFlush() {
  if (debounceTimer) return;
  debounceTimer = setTimeout(flushPending, DEBOUNCE_MS);
}

function queueUser(screenName: string, article: HTMLElement, avatarContainer: HTMLElement | null) {
  if (inFlightUsers.has(screenName)) return;
  if (pendingUsers.has(screenName)) return;

  inFlightUsers.add(screenName);
  pendingUsers.set(screenName, { article, avatarContainer });
  scheduleFlush();
}

async function onTweetVisible(article: HTMLElement) {
  const screenName = extractScreenName(article);
  if (!screenName) {
    console.log('[x-iq] Could not extract screenName from article');
    return;
  }

  const avatarContainer = findAvatarContainer(article);
  if (!avatarContainer) {
    console.log(`[x-iq] Could not find avatar container for @${screenName}`);
  }
  
  // Check cache first
  if (applyCachedIQ(article, avatarContainer, screenName)) {
    console.log(`[x-iq] Using cached IQ for @${screenName}`);
    return;
  }

  // Show loading state and queue for analysis
  console.log(`[x-iq] Queueing @${screenName} for analysis`);
  setLoading(article, avatarContainer);
  queueUser(screenName, article, avatarContainer);
}

function setupVisibilityObserver() {
  visibilityObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;

        const article = entry.target as HTMLElement;
        if (getState(article)) continue;

        visibilityObserver?.unobserve(article);
        onTweetVisible(article);
      }
    },
    { root: null, rootMargin: '100px', threshold: 0.1 }
  );
}

function observeArticle(article: HTMLElement) {
  if (getState(article)) return;

  if (!settings?.enabled || !settings?.apiKey) {
    return;
  }

  visibilityObserver?.observe(article);
}

function observeTimeline() {
  setupVisibilityObserver();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;

        if (node.tagName === 'ARTICLE') {
          observeArticle(node);
        } else {
          node.querySelectorAll('article').forEach(a => observeArticle(a as HTMLElement));
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  document.querySelectorAll('article').forEach(a => observeArticle(a as HTMLElement));
}

// Handle URL changes (SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    document.querySelectorAll('article').forEach(article => {
      const el = article as HTMLElement;
      if (!getState(el)) {
        observeArticle(el);
      }
    });
  }
}).observe(document, { subtree: true, childList: true });

// Listen for settings updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SETTINGS_UPDATED') {
    loadSettings().then(() => {
      // Clear pending requests
      pendingUsers.clear();
      inFlightUsers.clear();
      userDataQueue.clear();

      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }

      // Re-observe articles
      document.querySelectorAll('article').forEach(article => {
        resetState(article as HTMLElement);
        observeArticle(article as HTMLElement);
      });
    });
  }
});

async function init() {
  console.log('[x-iq] Content script initializing...');
  await loadSettings();
  console.log('[x-iq] Settings loaded:', { enabled: settings?.enabled, hasApiKey: !!settings?.apiKey });

  if (settings?.enabled && settings?.apiKey) {
    console.log('[x-iq] Starting timeline observer');
    observeTimeline();
  } else {
    console.log('[x-iq] Extension disabled or no API key');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
