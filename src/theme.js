import { useEffect, useState } from 'react';

// Light/dark theme choice: 'auto' (match the device), 'light' or 'dark'.
// Saved per browser in localStorage. public/index.html applies the saved
// choice before first paint (same key and rules), so there's no flash; this
// module keeps it in sync once React is running.

export const THEME_KEY = 'scoreboard-theme';
export const THEME_MODES = ['auto', 'light', 'dark'];

export function readStoredTheme() {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return THEME_MODES.includes(v) ? v : 'auto';
  } catch {
    return 'auto'; // storage blocked (private mode etc.)
  }
}

export function storeTheme(mode) {
  try {
    if (mode === 'auto') window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, mode);
  } catch {
    /* not saved; still applies for this visit */
  }
}

const systemPrefersDark = () =>
  !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

// The theme actually shown for a choice.
export function resolveTheme(mode, prefersDark) {
  if (mode === 'light' || mode === 'dark') return mode;
  return prefersDark ? 'dark' : 'light';
}

// Current choice + setter. Applies data-bs-theme on <html> (Bootstrap and the
// app's CSS tokens read it) and, in 'auto', follows device changes live.
export function useTheme() {
  const [mode, setModeState] = useState(readStoredTheme);

  useEffect(() => {
    const apply = () => document.documentElement.setAttribute('data-bs-theme', resolveTheme(mode, systemPrefersDark()));
    apply();
    if (mode !== 'auto' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, [mode]);

  const setMode = (next) => {
    storeTheme(next);
    setModeState(next);
  };
  return [mode, setMode];
}
