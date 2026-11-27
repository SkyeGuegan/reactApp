import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditPlayerDialog from './EditPlayerDialog';

const players = [
  { id: 'a', initials: 'SG' },
  { id: 'b', initials: 'MG' },
];
const names = new Map([['a', 'Sam Garner'], ['b', 'Morgan G']]);

test('prefills initials and full name, and saves changes', async () => {
  const saved = [];
  const onSave = async (info) => { saved.push(info); return true; };
  let hidden = false;
  render(<EditPlayerDialog player={players[0]} players={players} playerNames={names} onHide={() => { hidden = true; }} onSave={onSave} />);
  expect(screen.getByLabelText('Initials')).toHaveValue('SG');
  expect(screen.getByLabelText('Full name')).toHaveValue('Sam Garner');
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Sam G.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(hidden).toBe(true));
  expect(saved).toEqual([{ initials: 'SG', name: 'Sam G.' }]);
});

test('blocks initials another player already has, naming who', () => {
  render(<EditPlayerDialog player={players[0]} players={players} playerNames={names} onHide={() => {}} onSave={async () => true} />);
  fireEvent.change(screen.getByLabelText('Initials'), { target: { value: 'mg' } });
  expect(screen.getByRole('alert')).toHaveTextContent('MG is already used by Morgan G');
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
});
