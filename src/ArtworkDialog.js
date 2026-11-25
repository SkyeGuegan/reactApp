import React, { useEffect, useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

// Pull a BoardGameGeek id out of a pasted game link ("…/boardgame/13/catan")
// or a bare number. Returns null if there isn't one.
export function parseBggId(text) {
  const t = (text || '').trim();
  if (!t) return null;
  const fromUrl = t.match(/boardgamegeek\.com\/boardgame(?:expansion)?\/(\d+)/i);
  if (fromUrl) return Number(fromUrl[1]);
  return /^\d+$/.test(t) ? Number(t) : null;
}

// Admin dialog to set (or clear) a game's box art and BoardGameGeek link.
// onSave({ bggId, imageUrl }) resolves truthy on success.
export default function ArtworkDialog({ game, onHide, onSave }) {
  const [bgg, setBgg] = useState('');
  const [image, setImage] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    if (!game) return;
    setBgg(game.bggId ? `https://boardgamegeek.com/boardgame/${game.bggId}` : '');
    setImage(game.imageUrl || '');
    setBusy(false);
  }, [game]);
  useEffect(() => setPreviewFailed(false), [image]);

  const bggId = parseBggId(bgg);
  const bggError = bgg.trim() && !bggId ? 'Paste the game\'s BoardGameGeek page link, or its number.' : '';
  const imageUrl = image.trim();
  const imageError = imageUrl && !/^https:\/\//i.test(imageUrl) ? 'Use an image link starting with https://' : '';

  async function save() {
    setBusy(true);
    const ok = await onSave({ bggId: bggId || null, imageUrl: imageUrl || null });
    setBusy(false);
    if (ok) onHide();
  }

  return (
    <Modal show={!!game} onHide={() => !busy && onHide()} centered>
      <Modal.Header closeButton={!busy}>
        <Modal.Title>Artwork for {game ? game.name : ''}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group controlId="art-bgg" className="mb-3">
          <Form.Label className="fw-semibold">BoardGameGeek page</Form.Label>
          <Form.Control value={bgg} onChange={e => setBgg(e.target.value)} placeholder="https://boardgamegeek.com/boardgame/13/catan" isInvalid={!!bggError} />
          {bggError
            ? <div className="text-danger small mt-1">{bggError}</div>
            : <Form.Text>Makes the game's name a link to its BGG page.</Form.Text>}
        </Form.Group>
        <Form.Group controlId="art-image">
          <Form.Label className="fw-semibold">Box art image link</Form.Label>
          <Form.Control value={image} onChange={e => setImage(e.target.value)} placeholder="https://cf.geekdo-images.com/…" isInvalid={!!imageError} />
          {imageError
            ? <div className="text-danger small mt-1">{imageError}</div>
            : <Form.Text>On the game's BGG page, right-click the box art and choose “Copy image address”.</Form.Text>}
        </Form.Group>
        {imageUrl && !imageError && (
          <div className="art-preview mt-3">
            {previewFailed
              ? <span className="text-danger small">That image didn't load. Check the link.</span>
              : <img src={imageUrl} alt={`Preview of ${game ? game.name : 'the game'} box art`} referrerPolicy="no-referrer" onError={() => setPreviewFailed(true)} />}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        {(game && (game.bggId || game.imageUrl)) && (
          <Button variant="link" className="me-auto text-danger p-0" disabled={busy} onClick={() => { setBgg(''); setImage(''); }}>Clear both</Button>
        )}
        <Button variant="secondary" disabled={busy} onClick={onHide}>Cancel</Button>
        <Button variant="dark" disabled={busy || !!bggError || !!imageError} onClick={save}>{busy ? 'Saving…' : 'Save'}</Button>
      </Modal.Footer>
    </Modal>
  );
}
