import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { resolveTheme, readStoredTheme, THEME_KEY, useTheme } from './theme';
import ThemeMenu from './ThemeMenu';

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-bs-theme');
  window.matchMedia = window.matchMedia || ((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
});

test('resolveTheme: an explicit choice wins, auto follows the device', () => {
  expect(resolveTheme('dark', false)).toBe('dark');
  expect(resolveTheme('light', true)).toBe('light');
  expect(resolveTheme('auto', true)).toBe('dark');
  expect(resolveTheme('auto', false)).toBe('light');
});

test('readStoredTheme ignores missing or junk values', () => {
  expect(readStoredTheme()).toBe('auto');
  window.localStorage.setItem(THEME_KEY, 'purple');
  expect(readStoredTheme()).toBe('auto');
  window.localStorage.setItem(THEME_KEY, 'dark');
  expect(readStoredTheme()).toBe('dark');
});

function Harness() {
  const [mode, setMode] = useTheme();
  return <ThemeMenu mode={mode} onChange={setMode} />;
}

test('choosing Dark applies it, saves it, and Automatic clears the saved choice', async () => {
  render(<Harness />);
  expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');

  fireEvent.click(screen.getByRole('button', { name: 'Theme: Automatic' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Dark' }));
  expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
  expect(window.localStorage.getItem(THEME_KEY)).toBe('dark');

  fireEvent.click(screen.getByRole('button', { name: 'Theme: Dark' }));
  fireEvent.click(await screen.findByRole('button', { name: /Automatic/ }));
  expect(window.localStorage.getItem(THEME_KEY)).toBeNull();
  expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
});
