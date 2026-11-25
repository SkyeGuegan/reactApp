import { parseBggId } from './ArtworkDialog';

test('parseBggId reads BGG links and bare numbers', () => {
  expect(parseBggId('https://boardgamegeek.com/boardgame/13/catan')).toBe(13);
  expect(parseBggId('boardgamegeek.com/boardgame/237182')).toBe(237182);
  expect(parseBggId('  9209 ')).toBe(9209);
  expect(parseBggId('https://example.com/catan')).toBeNull();
  expect(parseBggId('')).toBeNull();
});

test('bggSearchUrl searches BoardGameGeek for the game name', () => {
  const { bggSearchUrl } = require('./ArtworkDialog');
  expect(bggSearchUrl(' Sushi Go! ')).toBe('https://boardgamegeek.com/geeksearch.php?action=search&objecttype=boardgame&q=Sushi%20Go!');
});
