const BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
const BASE_URL = 'https://x.com/i/api/graphql';

const RATE_LIMIT = 50;
const RATE_WINDOW_MS = 10 * 60 * 1000;

let requestTimestamps: number[] = [];

function getCsrfToken(): string | null {
  const match = document.cookie.match(new RegExp('(^| )ct0=([^;]+)'));
  return match ? match[2] : null;
}

function canMakeRequest(): boolean {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter(ts => now - ts < RATE_WINDOW_MS);
  return requestTimestamps.length < RATE_LIMIT;
}

function recordRequest(): void {
  requestTimestamps.push(Date.now());
}

export async function request<T>(
  endpoint: string, 
  variables: Record<string, unknown>,
  features?: Record<string, boolean>
): Promise<T | null> {
  if (!canMakeRequest()) {
    console.warn('[x-iq] Rate limited, skipping request');
    return null;
  }

  const csrfToken = getCsrfToken();
  if (!csrfToken) {
    console.warn('[x-iq] No CSRF token found');
    return null;
  }

  let url = `${BASE_URL}/${endpoint}?variables=${encodeURIComponent(JSON.stringify(variables))}`;
  
  if (features) {
    url += `&features=${encodeURIComponent(JSON.stringify(features))}`;
  }

  recordRequest();

  try {
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'accept': '*/*',
        'authorization': `Bearer ${BEARER_TOKEN}`,
        'x-csrf-token': csrfToken,
        'x-twitter-active-user': 'yes',
        'x-twitter-auth-type': 'OAuth2Session',
        'x-twitter-client-language': 'en',
      }
    });

    if (!response.ok) {
      console.warn(`[x-iq] API error: ${response.status} ${response.statusText}`);
      return null;
    }

    return response.json();
  } catch (e) {
    console.error('[x-iq] Fetch error:', e);
    return null;
  }
}
