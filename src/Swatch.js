import React from 'react';
import { Dropdown } from 'react-bootstrap';
import { optionsOf, optionFor, playerDetailsOf, playerFields, mainScoreField, placings } from './scoring';

// A small colour dot for a choice (e.g. a Terra Mystica faction's terrain).
// color 'any' (factions that pick any colour) shows a rainbow.
export function Swatch({ color, title }) {
  if (!color) return null;
  const style = color === 'any'
    ? { background: 'conic-gradient(#c7352b, #e3b929, #2e8b3d, #2f6fd0, #8b5a2b, #c7352b)' }
    : { background: color };
  return <span className="swatch" style={style} title={title} aria-hidden="true" />;
}

// Colour-chip picker for one player's choice. Choices another player already
// has (taken: Set of names) are greyed out. onChange('') clears it.
export function ChoicePicker({ field, value, onChange, taken = new Set(), label }) {
  const opts = optionsOf(field);
  const current = optionFor(field, value);
  return (
    <Dropdown className="choice-picker">
      <Dropdown.Toggle size="sm" variant="outline-secondary" className="choice-toggle" aria-label={label}>
        {current
          ? <><Swatch color={current.color} /><span className="choice-name">{current.name}</span></>
          : <span className="text-muted">Pick…</span>}
      </Dropdown.Toggle>
      <Dropdown.Menu className="choice-menu" popperConfig={{ strategy: 'fixed' }} renderOnMount>
        <div className="choice-grid">
          {opts.map(o => {
            const isTaken = taken.has(o.name) && o.name !== value;
            return (
              <Dropdown.Item
                key={o.name}
                as="button"
                type="button"
                className="choice-chip"
                active={o.name === value}
                disabled={isTaken}
                title={isTaken ? `${o.group || o.name} is taken` : o.group}
                onClick={() => onChange(o.name)}
              >
                <Swatch color={o.color} /><span>{o.name}</span>
              </Dropdown.Item>
            );
          })}
        </div>
        {value && (
          <>
            <Dropdown.Divider />
            <Dropdown.Item as="button" type="button" className="small" onClick={() => onChange('')}>Clear</Dropdown.Item>
          </>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}

// "SG (● Witches, 142)": a player's label plus their noted details in this
// play, with a colour dot before coloured choices. Just the label if none.
export function PlayerDetails({ play, game, playerId, label }) {
  const row = playerDetailsOf(play)[playerId];
  const bits = row
    ? playerFields(game).filter(f => row[f.key] !== undefined && row[f.key] !== null && row[f.key] !== '').map(f => {
      const v = row[f.key];
      const o = f.type === 'text' && !Array.isArray(v) ? optionFor(f, v) : null;
      return <React.Fragment key={f.key}>{o && <Swatch color={o.color} />}{[].concat(v).join(' + ')}</React.Fragment>;
    })
    : [];
  if (!bits.length) return <>{label}</>;
  return <>{label} ({bits.map((b, i) => <React.Fragment key={i}>{i > 0 && ', '}{b}</React.Fragment>)})</>;
}

const noted = (v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length);

// A play's players one per line, in aligned columns — "SG  ● Witches  118" —
// best finish first (as entered when there are no scores); winners in bold.
// label(id) names a player. Returns null when nothing was noted for anyone,
// so the caller can show a plain list instead.
export function PlayerLines({ play, game, label }) {
  const details = playerDetailsOf(play);
  const fields = playerFields(game).filter(f => play.playerIds.some(id => details[id] && noted(details[id][f.key])));
  if (!fields.length) return null;
  const placed = placings(play, mainScoreField(game));
  const rank = (id) => (placed[id] ? placed[id].place : Infinity);
  const ids = [...play.playerIds].sort((a, b) => rank(a) - rank(b));
  return (
    <div className="player-lines" style={{ gridTemplateColumns: `auto repeat(${fields.length}, auto)` }}>
      {ids.map(id => {
        const row = details[id] || {};
        const won = play.winnerIds.includes(id);
        return (
          <div key={id} className={`player-line${won ? ' won' : ''}`}>
            <span className="pl-name">{label(id)}</span>
            {fields.map(f => {
              const v = row[f.key];
              if (!noted(v)) return <span key={f.key} className="pl-empty" />;
              const o = f.type === 'text' && !Array.isArray(v) ? optionFor(f, v) : null;
              return (
                <span key={f.key} className={f.type === 'number' ? 'pl-num' : 'pl-text'} title={f.type === 'number' ? undefined : [].concat(v).join(' + ')}>
                  {o && <Swatch color={o.color} />}{[].concat(v).join(' + ')}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
