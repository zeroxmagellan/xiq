export type IQState = 'idle' | 'loading' | 'done' | 'hidden';

function getIQColor(iq: number): string {
  if (iq < 85) return '#ef4444';      // Red
  if (iq < 100) return '#f97316';     // Orange
  if (iq < 115) return '#22c55e';     // Green
  if (iq < 130) return '#3b82f6';     // Blue
  return '#a855f7';                    // Purple (130+)
}

function getIQLabel(iq: number): string {
  if (iq < 85) return 'Below Average';
  if (iq < 100) return 'Average';
  if (iq < 115) return 'Above Average';
  if (iq < 130) return 'High';
  return 'Genius';
}

export function getState(article: HTMLElement): IQState | null {
  if (article.dataset.xiqLoading === 'true') return 'loading';
  if (article.dataset.xiqDone === 'true') return 'done';
  if (article.dataset.xiqHidden === 'true') return 'hidden';
  return null;
}

export function setState(article: HTMLElement, state: IQState) {
  article.dataset.xiqLoading = state === 'loading' ? 'true' : '';
  article.dataset.xiqDone = state === 'done' ? 'true' : '';
  article.dataset.xiqHidden = state === 'hidden' ? 'true' : '';
}

export function resetState(article: HTMLElement) {
  article.dataset.xiqLoading = '';
  article.dataset.xiqDone = '';
  article.dataset.xiqHidden = '';
  
  // Remove existing badge and overlay
  const existingBadge = article.querySelector('.xiq-badge');
  if (existingBadge) {
    existingBadge.remove();
  }
  
  const wrapper = article.parentElement;
  if (wrapper?.classList.contains('xiq-wrapper')) {
    wrapper.querySelector('.xiq-hidden-overlay')?.remove();
  }
}

export function setLoading(article: HTMLElement, avatarContainer: HTMLElement | null) {
  setState(article, 'loading');
  
  if (!avatarContainer) return;
  
  // Check if badge already exists
  if (avatarContainer.querySelector('.xiq-badge')) return;
  
  const badge = document.createElement('div');
  badge.className = 'xiq-badge xiq-badge-loading';
  badge.innerHTML = '<div class="xiq-spinner"></div>';
  
  avatarContainer.style.position = 'relative';
  avatarContainer.appendChild(badge);
}

export function setIQBadge(article: HTMLElement, avatarContainer: HTMLElement | null, iq: number) {
  setState(article, 'done');
  
  if (!avatarContainer) return;
  
  // Remove loading badge if exists
  const existingBadge = avatarContainer.querySelector('.xiq-badge');
  if (existingBadge) {
    existingBadge.remove();
  }
  
  const color = getIQColor(iq);
  const label = getIQLabel(iq);
  
  const badge = document.createElement('div');
  badge.className = 'xiq-badge xiq-badge-score';
  badge.style.setProperty('--xiq-color', color);
  badge.title = `IQ: ${iq} (${label})`;
  badge.textContent = iq.toString();
  
  avatarContainer.style.position = 'relative';
  avatarContainer.appendChild(badge);
}

export function setError(article: HTMLElement, avatarContainer: HTMLElement | null, reason?: string) {
  setState(article, 'done');
  
  // Remove the loading spinner
  if (avatarContainer) {
    const spinner = avatarContainer.querySelector('.xiq-badge-loading');
    if (spinner) {
      spinner.remove();
    }
    
    // Show error badge
    const badge = document.createElement('div');
    badge.className = 'xiq-badge xiq-badge-error';
    badge.title = reason || 'Failed to analyze';
    badge.textContent = '?';
    avatarContainer.appendChild(badge);
  }
}

function getWrapper(article: HTMLElement): HTMLElement {
  let wrapper = article.parentElement;
  if (wrapper?.classList.contains('xiq-wrapper')) {
    return wrapper;
  }

  wrapper = document.createElement('div');
  wrapper.className = 'xiq-wrapper';
  article.parentElement?.insertBefore(wrapper, article);
  wrapper.appendChild(article);
  return wrapper;
}

export function setHidden(article: HTMLElement, iq: number, reasoning?: string) {
  setState(article, 'hidden');
  const wrapper = getWrapper(article);
  
  // Remove any existing overlay
  wrapper.querySelector('.xiq-hidden-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'xiq-hidden-overlay';

  const card = document.createElement('div');
  card.className = 'xiq-hidden-card';

  const title = document.createElement('div');
  title.className = 'xiq-hidden-title';
  title.innerHTML = `<span class="xiq-hidden-iq" style="color: ${getIQColor(iq)}">${iq}</span> IQ`;

  const reasonEl = document.createElement('div');
  reasonEl.className = 'xiq-hidden-reason';
  reasonEl.textContent = reasoning || 'Below threshold';

  const btn = document.createElement('button');
  btn.className = 'xiq-reveal-btn';
  btn.textContent = 'Reveal';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    overlay.remove();
    setState(article, 'done');
    article.dataset.xiqHidden = '';
  });

  card.appendChild(title);
  card.appendChild(reasonEl);
  card.appendChild(btn);
  overlay.appendChild(card);
  wrapper.appendChild(overlay);
}

