import React, { useEffect, useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { fieldsOf, fieldKey, PRESETS } from './scoring';

// Admin dialog: choose which optional per-player details to collect when this
// game is recorded (e.g. Victory points; Faction + Points). Each field is a
// number or text; text fields can offer suggestions (any text still allowed).
// onSave(fields) resolves truthy on success. Existing recorded details keep
// their values even if a field is later removed.
export default function ScoringFieldsDialog({ game, onHide, onSave }) {
  const [fields, setFields] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!game) return;
    setFields(fieldsOf(game).map(f => ({ ...f, optionsText: (f.options || []).join(', ') })));
    setBusy(false);
  }, [game]);

  const update = (i, patch) => setFields(prev => prev.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const remove = (i) => setFields(prev => prev.filter((_, j) => j !== i));
  const add = () => setFields(prev => [...prev, { key: '', label: '', type: 'number', optionsText: '' }]);
  const applyPreset = (preset) => setFields(PRESETS[preset].map(f => ({ ...f, optionsText: (f.options || []).join(', ') })));

  // Final list: labelled fields only, each with a stable unique key.
  const finalFields = () => {
    const keys = [];
    return fields
      .filter(f => f.label.trim())
      .map(f => {
        const key = f.key && !keys.includes(f.key) ? f.key : fieldKey(f.label, keys);
        keys.push(key);
        const options = f.type === 'text'
          ? f.optionsText.split(',').map(o => o.trim()).filter(Boolean)
          : [];
        return { key, label: f.label.trim(), type: f.type, ...(options.length ? { options } : {}) };
      });
  };

  async function save() {
    setBusy(true);
    const ok = await onSave(finalFields());
    setBusy(false);
    if (ok) onHide();
  }

  return (
    <Modal show={!!game} onHide={() => !busy && onHide()} centered>
      <Modal.Header closeButton={!busy}>
        <Modal.Title>Scoring details for {game ? game.name : ''}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="small text-muted">
          Optional extras to note for each player when this game is recorded. Leaving them blank is always fine.
        </p>
        <div className="d-flex flex-wrap gap-2 mb-3">
          <span className="small text-muted align-self-center">Quick start:</span>
          <Button size="sm" variant="outline-secondary" onClick={() => applyPreset('points')}>Points</Button>
          <Button size="sm" variant="outline-secondary" onClick={() => applyPreset('victoryPoints')}>Victory points</Button>
          <Button size="sm" variant="outline-secondary" onClick={() => applyPreset('factionPoints')}>Faction + Points</Button>
        </div>

        {fields.length === 0 && <p className="small">No details collected for this game.</p>}
        {fields.map((f, i) => (
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
            {f.type === 'text' && (
              <Form.Control
                size="sm"
                className="mt-1"
                value={f.optionsText}
                onChange={e => update(i, { optionsText: e.target.value })}
                placeholder="Suggestions, separated by commas (optional)"
                aria-label={`Field ${i + 1} suggestions`}
              />
            )}
          </div>
        ))}
        <Button size="sm" variant="link" className="p-0" onClick={add}>＋ Add a field</Button>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" disabled={busy} onClick={onHide}>Cancel</Button>
        <Button variant="dark" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</Button>
      </Modal.Footer>
    </Modal>
  );
}
