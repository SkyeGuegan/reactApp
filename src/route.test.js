import { parseRoute, gameSlug, playerHref, viewHref } from './route';

test('every view has its own address', () => {
  expect(parseRoute('')).toEqual({ page: 'board', view: 'scoreboard' });
  expect(parseRoute('#/')).toEqual({ page: 'board', view: 'scoreboard' });
  expect(parseRoute('#/players')).toEqual({ page: 'board', view: 'players' });
  expect(parseRoute('#/log/')).toEqual({ page: 'board', view: 'log' });
  expect(parseRoute('#/trends')).toEqual({ page: 'board', view: 'trends' });
  expect(parseRoute('#/pick')).toEqual({ page: 'board', view: 'pick' });
  expect(parseRoute('#/manage')).toEqual({ page: 'manage' });
  expect(parseRoute('#/nonsense')).toEqual({ page: 'board', view: 'scoreboard' });
});

test('game and player pages', () => {
  expect(parseRoute('#/game/terra-mystica')).toEqual({ page: 'game', slug: 'terra-mystica' });
  expect(parseRoute('#/player/SG')).toEqual({ page: 'player', slug: 'sg' });
  expect(gameSlug('Sushi Go!')).toBe('sushi-go');
  expect(playerHref({ initials: 'SG' })).toBe('#/player/sg');
  expect(viewHref('log')).toBe('#/log');
  expect(viewHref('scoreboard')).toBe('#/');
});
