const RESERVED_PATHS = ['home', 'explore', 'notifications', 'messages', 'i', 'search', 'settings', 'compose'];

export function isHomeFeed(): boolean {
  const path = window.location.pathname;
  return path === '/home' || path === '/';
}

export function extractScreenName(article: HTMLElement): string | null {
  // Look for the user link in the tweet
  const userLinks = article.querySelectorAll('a[href^="/"][role="link"]');
  
  for (const link of userLinks) {
    const href = (link as HTMLAnchorElement).href;
    const match = href.match(/x\.com\/([^/?]+)/);
    
    if (match && !RESERVED_PATHS.includes(match[1].toLowerCase())) {
      return match[1];
    }
  }

  return null;
}

export function findAvatarContainer(article: HTMLElement): HTMLElement | null {
  // Find the avatar image container
  const avatar = article.querySelector('[data-testid="Tweet-User-Avatar"]');
  if (avatar) {
    return avatar as HTMLElement;
  }

  // Fallback: look for the avatar link
  const avatarLink = article.querySelector('a[href^="/"][role="link"] img[src*="profile_images"]');
  if (avatarLink) {
    return avatarLink.closest('a') as HTMLElement;
  }

  return null;
}

export function extractTweetId(article: HTMLElement): string | null {
  const links = article.querySelectorAll('a[href*="/status/"]');
  for (const link of links) {
    const href = (link as HTMLAnchorElement).href;
    const match = href.match(/\/status\/(\d+)/);
    if (match) return match[1];
  }
  return null;
}
