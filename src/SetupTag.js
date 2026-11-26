import React from 'react';
import { setupLabel, setupOptions } from './scoring';

// A play's game-level setup, e.g. Catan "Seafarers + Cities & Knights", with
// any box art. Shows nothing for plays with no setup noted, and stays quiet for
// the field's default ("Base game") unless showDefault is set.
export default function SetupTag({ play, game, showDefault = false }) {
  if (!game) return null;
  const options = setupOptions(play, game);
  if (!options.length && !showDefault) return null;
  const label = setupLabel(play, game);
  if (!label) return null;
  return (
    <span className="setup-tag">
      {options.filter(o => o.imageUrl).map(o => (
        <img key={o.name} src={o.imageUrl} alt="" title={o.name} referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none'; }} />
      ))}
      <span>{label}</span>
    </span>
  );
}
