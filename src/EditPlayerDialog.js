import React, { useEffect, useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

// Admin dialog: change a player's initials (the public label, must stay
// unique) and full name (admin-only, to tell players apart).
// onSave({ initials, name }) resolves truthy on success.
export default function EditPlayerDialog({ player, players, playerNames, onHide, onSave }) {
  const [initials, setInitials] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!player) return;
    setInitials(player.initials);
    setName(playerNames.get(player.id) || '');
    setBusy(false);
  }, [player, playerNames]);

  const clash = player && initials.trim()
    ? players.find(p => p.id !== player.id && p.initials.toUpperCase() === initials.trim().toUpperCase())
    : null;
  const error = !initials.trim()
    ? 'Initials are required.'
    : clash
      ? `${clash.initials} is already used${playerNames.get(clash.id) ? ` by ${playerNames.get(clash.id)}` : ''}. Try a variation, like ${initials.trim().toUpperCase().slice(0, 2)}${(name.trim().split(/\s+/)[1] || 'X')[0].toUpperCase()}.`
      : '';

  async function save() {
    setBusy(true);
    const ok = await onSave({ initials, name });
    setBusy(false);
    if (ok) onHide();
  }

  return (
    <Modal show={!!player} onHide={() => !busy && onHide()} centered>
      <Modal.Header closeButton={!busy}>
        <Modal.Title>Edit player</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group controlId="edit-initials" className="mb-3">
          <Form.Label className="fw-semibold">Initials</Form.Label>
          <Form.Control
            value={initials}
            onChange={e => setInitials(e.target.value.toUpperCase())}
            maxLength={4}
            isInvalid={!!error}
            style={{ maxWidth: 140 }}
          />
          {error
            ? <div className="text-danger small mt-1" role="alert">{error}</div>
            : <Form.Text>Shown everywhere on the site. Up to 4 letters, unique.</Form.Text>}
        </Form.Group>
        <Form.Group controlId="edit-name">
          <Form.Label className="fw-semibold">Full name</Form.Label>
          <Form.Control value={name} onChange={e => setName(e.target.value)} placeholder="Optional" />
          <Form.Text>Only admins can see this — it isn't part of the public site or its data.</Form.Text>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" disabled={busy} onClick={onHide}>Cancel</Button>
        <Button variant="dark" disabled={busy || !!error} onClick={save}>{busy ? 'Saving…' : 'Save'}</Button>
      </Modal.Footer>
    </Modal>
  );
}
