import React, { useEffect, useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { fieldsOf, fieldKey, optionsOf, PRESETS, suggestedFor } from './scoring';
import ArtworkDialog from './ArtworkDialog';

// Admin dialog: choose which optional details to collect when this game is
// recorded. Each field is a number or text, asked per player (Victory points,
// Faction) or once per game (Catan expansions, Ticket to Ride map). Numbers can
// be "lowest wins"; text can offer choices (pick one, or several), and each
// choice can have box art from BoardGameGeek. onSave(fields) resolves truthy on
// success. Recorded details keep their values even if a field is later removed.

// Editable copy of a field: options as comma text, art kept by option name.
const toDraft = (f) => ({
  ...f,
  optionsText: optionsOf(f).map(o => o.name).join(', '),
  art: Object.fromEntries(optionsOf(f).filter(o => o.bggId || o.imageUrl).map(o => [o.name, { bggId: o.bggId || null, imageUrl: o.imageUrl || null }])),
});
const optionList = (f) => (f.type === 'text' ? f.optionsText.split(',').map(o => o.trim()).filter(Boolean) : []);

export default function ScoringFieldsDialog({ game, onHide, onSave }) {
  const [fields, setFields] = useState([]);
  const [busy, setBusy] = useState(false);
  const [artFor, setArtFor] = useState(null); // { i, name } while an option's artwork dialog is open

  useEffect(() => {
    if (!game) return;
    setFields(fieldsOf(game).map(toDraft));
    setBusy(false);
  }, [game]);

  const suggested = suggestedFor(game);
  const update = (i, patch) => setFields(prev => prev.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const remove = (i) => setFields(prev => prev.filter((_, j) => j !== i));
  const add = () => setFields(prev => [...prev, { key: '', label: '', type: 'number', optionsText: '', art: {} }]);
  // Presets replace the list but keep any art already set for same-named options.
  const apply = (list) => setFields(prev => list.map(f => {
    const d = toDraft(f);
    const old = prev.find(p => p.key === f.key);
    return old ? { ...d, art: { ...old.art, ...d.art } } : d;
  }));

  // Final list: labelled fields only, each with a stable unique key; options
  // with art become { name, bggId, imageUrl }, the rest stay plain names.
  const finalFields = () => {
    const keys = [];
    return fields
      .filter(f => f.label.trim())
      .map(f => {
        const key = f.key && !keys.includes(f.key) ? f.key : fieldKey(f.label, keys);
        keys.push(key);
        const options = optionList(f).map(name => {
          const a = f.art[name];
          return a && (a.bggId || a.imageUrl) ? { name, ...(a.bggId ? { bggId: a.bggId } : {}), ...(a.imageUrl ? { imageUrl: a.imageUrl } : {}) } : name;
        });
        const game = f.scope === 'game';
        const multi = f.type === 'text' && options.length > 0 && !!f.multi;
        return {
          key, label: f.label.trim(), type: f.type,
          ...(game ? { scope: 'game' } : {}),
          ...(multi ? { multi: true } : {}),
          ...(f.type === 'number' && f.lowWins ? { lowWins: true } : {}),
          ...(game && multi && f.emptyLabel && f.emptyLabel.trim() ? { emptyLabel: f.emptyLabel.trim() } : {}),
          ...(options.length ? { options } : {}),
        };
      });
  };

  async function save() {
    setBusy(true);
    const ok = await onSave(finalFields());
    setBusy(false);
    if (ok) onHide();
  }

  const artField = artFor ? fields[artFor.i] : null;
  const artTarget = artFor && artField ? { name: `${game.name}: ${artFor.name}`, ...(artField.art[artFor.name] || {}) } : null;

  return (
    <>
      <Modal show={!!game && !artFor} onHide={() => !busy && onHide()} centered>
        <Modal.Header closeButton={!busy}>
          <Modal.Title>Scoring details for {game ? game.name : ''}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small text-muted">
            Optional extras to note when this game is recorded. Leaving them blank is always fine.
          </p>
          <div className="d-flex flex-wrap gap-2 mb-3">
            <span className="small text-muted align-self-center">Quick start:</span>
            {suggested && suggested.length > 0 && (
              <Button size="sm" variant="dark" onClick={() => apply(suggested)}>Suggested for {game.name}</Button>
            )}
            <Button size="sm" variant="outline-secondary" onClick={() => apply(PRESETS.points)}>Points</Button>
            <Button size="sm" variant="outline-secondary" onClick={() => apply(PRESETS.victoryPoints)}>Victory points</Button>
            <Button size="sm" variant="outline-secondary" onClick={() => apply(PRESETS.lowPoints)}>Points, lowest wins</Button>
            <Button size="sm" variant="outline-secondary" onClick={() => apply(PRESETS.factionPoints)}>Faction + Points</Button>
          </div>

          {fields.length === 0 && <p className="small">No details collected for this game.</p>}
          {fields.map((f, i) => {
            const opts = optionList(f);
            return (
              <div key={i} className="scoring-field mb-2">
                <div className="d-flex gap-2 align-items-center">
                  <Form.Control
                    size="sm"
                    value={f.label}
                    onChange={e => update(i, { label: e.target.value })}
                    placeholder="Name, e.g. Victory points"
                    aria-label={`Field ${i + 1} name`}
                  />
                  <Form.Select size="sm" value={f.type} onChange={e => update(i, { type: e.target.value })} aria-label={`Field ${i + 1} type`} style={{ maxWidth: 120 }}>
                    <option value="number">Number</option>
                    <option value="text">Text</option>
                  </Form.Select>
                  <button type="button" className="btn-close" aria-label={`Remove ${f.label || 'field'}`} onClick={() => remove(i)} />
                </div>
                <div className="d-flex flex-wrap gap-3 mt-1 small">
                  <Form.Check
                    id={`field-${i}-game`}
                    label="Once per game (not per player)"
                    checked={f.scope === 'game'}
                    onChange={e => update(i, { scope: e.target.checked ? 'game' : undefined })}
                  />
                  {f.type === 'number' && (
                    <Form.Check id={`field-${i}-low`} label="Lowest wins" checked={!!f.lowWins} onChange={e => update(i, { lowWins: e.target.checked })} />
                  )}
                  {f.type === 'text' && (
                    <Form.Check id={`field-${i}-multi`} label="Pick several" checked={!!f.multi} onChange={e => update(i, { multi: e.target.checked })} />
                  )}
                </div>
                {f.type === 'text' && (
                  <Form.Control
                    size="sm"
                    className="mt-1"
                    value={f.optionsText}
                    onChange={e => update(i, { optionsText: e.target.value })}
                    placeholder={f.multi ? 'Choices, separated by commas' : 'Choices for a dropdown, separated by commas (optional)'}
                    aria-label={`Field ${i + 1} choices`}
                  />
                )}
                {f.type === 'text' && f.multi && f.scope === 'game' && (
                  <Form.Control
                    size="sm"
                    className="mt-1"
                    value={f.emptyLabel || ''}
                    onChange={e => update(i, { emptyLabel: e.target.value })}
                    placeholder="When none are picked, e.g. Base game (optional)"
                    aria-label={`Field ${i + 1} label when none picked`}
                  />
                )}
                {opts.length > 0 && (
                  <div className="d-flex flex-wrap gap-1 mt-1">
                    {opts.map(name => {
                      const a = f.art[name];
                      return (
                        <Button key={name} size="sm" variant="outline-secondary" className="option-art-btn" onClick={() => setArtFor({ i, name })}>
                          {a && a.imageUrl ? <img src={a.imageUrl} alt="" referrerPolicy="no-referrer" /> : '🖼'} {name}
                        </Button>
                      );
                    })}
                    <span className="small text-muted align-self-center">← tap to set box art</span>
                  </div>
                )}
              </div>
            );
          })}
          <Button size="sm" variant="link" className="p-0" onClick={add}>＋ Add a field</Button>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" disabled={busy} onClick={onHide}>Cancel</Button>
          <Button variant="dark" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</Button>
        </Modal.Footer>
      </Modal>
      <ArtworkDialog
        game={artTarget}
        onHide={() => setArtFor(null)}
        onSave={async (art) => {
          update(artFor.i, { art: { ...artField.art, [artFor.name]: art } });
          return true;
        }}
      />
    </>
  );
}
