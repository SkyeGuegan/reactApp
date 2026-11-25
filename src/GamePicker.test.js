import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GamePicker from './GamePicker';

const games = [{ id: 'a', name: 'Azul' }, { id: 'c', name: 'Catan' }];

beforeEach(() => {
  window.localStorage.clear();
  // Reduced motion: the pick shows immediately, no animation to wait for.
  window.matchMedia = (q) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} });
});

test('spinning picks one of the games on the wheel and it can be removed', () => {
  render(<GamePicker games={games} plays={[]} isAdmin={false} onRecord={() => {}} onAddGame={() => {}} />);
  expect(screen.getByText('(2)')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Spin' }));
  const name = screen.getByText(/Let's play/).nextSibling.textContent;
  expect(['Azul', 'Catan']).toContain(name);
  fireEvent.click(screen.getByRole('button', { name: 'Remove from wheel' }));
  expect(screen.getByText('(1)')).toBeInTheDocument();
});

test('typed-in games join the wheel; admins can record a board game pick', () => {
  const onRecord = jest.fn();
  render(<GamePicker games={[games[1]]} plays={[]} isAdmin onRecord={onRecord} onAddGame={() => {}} />);
  fireEvent.change(screen.getByLabelText('Add a game to the wheel'), { target: { value: 'Wingspan' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getAllByText('Wingspan').length).toBe(2); // on the wheel and in the list
  expect(screen.getByText('(2)')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'None' }));
  fireEvent.click(screen.getByRole('button', { name: 'Spin' }));
  expect(screen.getByRole('button', { name: 'Add to the board' })).toBeInTheDocument();
});

test('nothing on the wheel disables Spin', () => {
  render(<GamePicker games={games} plays={[]} isAdmin={false} onRecord={() => {}} onAddGame={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'None' }));
  expect(screen.getByRole('button', { name: 'Spin' })).toBeDisabled();
});

test('wheel labels on the left half are flipped to read upright', () => {
  const four = [{ id: '1', name: 'One' }, { id: '2', name: 'Two' }, { id: '3', name: 'Three' }, { id: '4', name: 'Four' }];
  const { container } = render(<GamePicker games={four} plays={[]} isAdmin={false} onRecord={() => {}} onAddGame={() => {}} />);
  const transforms = [...container.querySelectorAll('svg.wheel text')].map(t => t.getAttribute('transform'));
  expect(transforms.filter(tr => tr.endsWith('rotate(180)')).length).toBe(2);
});
