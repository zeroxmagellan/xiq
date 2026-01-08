import { getSettings, saveSettings } from '../lib/storage';
import type { UserSettings } from '../types';

let currentSettings: UserSettings;

async function init() {
  currentSettings = await getSettings();
  renderUI();
  bindEvents();
  loadStats();
}

function renderUI() {
  const enableToggle = document.getElementById('enableToggle') as HTMLInputElement;
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  const hideLowIQToggle = document.getElementById('hideLowIQ') as HTMLInputElement;
  const thresholdSlider = document.getElementById('iqThreshold') as HTMLInputElement;
  const thresholdValue = document.getElementById('thresholdValue')!;

  enableToggle.checked = currentSettings.enabled;
  apiKeyInput.value = currentSettings.apiKey;
  hideLowIQToggle.checked = currentSettings.hideLowIQ;
  thresholdSlider.value = (currentSettings.iqThreshold || 100).toString();
  thresholdValue.textContent = (currentSettings.iqThreshold || 100).toString();
  
  // Update threshold color
  thresholdValue.style.color = getIQColor(currentSettings.iqThreshold || 100);
}

async function loadStats() {
  try {
    const stats = await chrome.runtime.sendMessage({ type: 'GET_IQ_STATS' });
    
    const avgIQEl = document.getElementById('avgIQ')!;
    const countEl = document.getElementById('analyzedCount')!;
    
    if (stats?.average !== null && stats?.average !== undefined) {
      avgIQEl.textContent = stats.average.toString();
      avgIQEl.style.color = getIQColor(stats.average);
    } else {
      avgIQEl.textContent = '—';
    }
    
    countEl.textContent = (stats?.count || 0).toString();
  } catch {
    // Stats not available
  }
}

function getIQColor(iq: number): string {
  if (iq < 85) return '#ef4444';
  if (iq < 100) return '#f97316';
  if (iq < 115) return '#22c55e';
  if (iq < 130) return '#3b82f6';
  return '#a855f7';
}

function notifySettingsUpdate() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'SETTINGS_UPDATED' });
    }
  });
}

async function save() {
  const enableToggle = document.getElementById('enableToggle') as HTMLInputElement;
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  const hideLowIQToggle = document.getElementById('hideLowIQ') as HTMLInputElement;
  const thresholdSlider = document.getElementById('iqThreshold') as HTMLInputElement;

  await saveSettings({
    enabled: enableToggle.checked,
    apiKey: apiKeyInput.value,
    hideLowIQ: hideLowIQToggle.checked,
    iqThreshold: parseInt(thresholdSlider.value, 10)
  });

  notifySettingsUpdate();
}

function bindEvents() {
  document.getElementById('toggleApiKey')?.addEventListener('click', () => {
    const input = document.getElementById('apiKey') as HTMLInputElement;
    const eyeIcon = document.getElementById('eyeIcon')!;
    const eyeOffIcon = document.getElementById('eyeOffIcon')!;
    
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    
    eyeIcon.classList.toggle('hidden', isPassword);
    eyeOffIcon.classList.toggle('hidden', !isPassword);
  });

  document.getElementById('enableToggle')?.addEventListener('change', save);
  document.getElementById('hideLowIQ')?.addEventListener('change', save);

  document.getElementById('iqThreshold')?.addEventListener('input', (e) => {
    const value = (e.target as HTMLInputElement).value;
    const thresholdValue = document.getElementById('thresholdValue')!;
    thresholdValue.textContent = value;
    thresholdValue.style.color = getIQColor(parseInt(value, 10));
  });

  document.getElementById('iqThreshold')?.addEventListener('change', save);

  let apiKeyTimeout: ReturnType<typeof setTimeout>;
  document.getElementById('apiKey')?.addEventListener('input', () => {
    clearTimeout(apiKeyTimeout);
    apiKeyTimeout = setTimeout(save, 800);
  });
}

init();
