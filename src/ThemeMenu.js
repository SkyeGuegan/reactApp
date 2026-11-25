import React from 'react';
import { Dropdown } from 'react-bootstrap';

const LABELS = { auto: 'Automatic', light: 'Light', dark: 'Dark' };
const HINTS = { auto: 'Match this device', light: null, dark: null };

// Small inline icons (no icon library in the app): sun, moon, half-filled circle.
function ThemeIcon({ mode }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', 'aria-hidden': true, focusable: 'false' };
  if (mode === 'light') {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
      </svg>
    );
  }
  if (mode === 'dark') {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" />
    </svg>
  );
}

// Header control for the light/dark theme: Automatic (device), Light, Dark.
export default function ThemeMenu({ mode, onChange }) {
  return (
    <Dropdown align="end">
      <Dropdown.Toggle
        variant="outline-light"
        size="sm"
        className="theme-toggle"
        aria-label={`Theme: ${LABELS[mode]}`}
        title={`Theme: ${LABELS[mode]}`}
      >
        <ThemeIcon mode={mode} />
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <Dropdown.Header>Theme</Dropdown.Header>
        {['auto', 'light', 'dark'].map(m => (
          <Dropdown.Item
            key={m}
            as="button"
            active={m === mode}
            aria-current={m === mode ? 'true' : undefined}
            onClick={() => onChange(m)}
            className="d-flex align-items-center gap-2"
          >
            <ThemeIcon mode={m} />
            <span>
              {LABELS[m]}
              {HINTS[m] && <span className="d-block small text-body-secondary">{HINTS[m]}</span>}
            </span>
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
