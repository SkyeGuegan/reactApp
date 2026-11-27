import { useEffect, useState } from 'react';

// Minimal hash routing. Every view has its own address, so links, Back and
// refresh all work (hash addresses need no Amplify rewrite rules):
//   #/                  Scoreboard (the main table)
//   #/players           Players (everyone's record)
//   #/log               Game log (every recorded game)
//   #/trends            Trends (wins over time)
//   #/pick              Pick a game
//   #/manage            Manage (admins)
//   #/game/<slug>       one game's page
//   #/player/<initials> one player's page
// Anything else is the Scoreboard.

// "Settlers of Catan" -> "settlers-of-catan", "Sushi Go!" -> "sushi-go".
export function gameSlug(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export const gameHref = (game) => `#/game/${gameSlug(game.name)}`;
export const playerSlug = (player) => (player.initials || '').toLowerCase();
export const playerHref = (player) => `#/player/${encodeURIComponent(playerSlug(player))}`;

// The board's views, in nav order: [view, address, label].
export const VIEWS = [
  ['scoreboard', '#/', 'Scoreboard'],
  ['players', '#/players', 'Players'],
  ['log', '#/log', 'Game log'],
  ['trends', '#/trends', 'Trends'],
  ['pick', '#/pick', 'Pick a game'],
];
export const viewHref = (view) => (VIEWS.find(v => v[0] === view) || VIEWS[0])[1];

export function parseRoute(hash) {
  const h = hash || '';
  const game = h.match(/^#\/game\/([^/?#]+)/);
  if (game) return { page: 'game', slug: decodeURIComponent(game[1]) };
  const player = h.match(/^#\/player\/([^/?#]+)/);
  if (player) return { page: 'player', slug: decodeURIComponent(player[1]).toLowerCase() };
  if (/^#\/manage\/?$/.test(h)) return { page: 'manage' };
  const view = VIEWS.find(([v, href]) => v !== 'scoreboard' && (h === href || h === `${href}/`));
  return { page: 'board', view: view ? view[0] : 'scoreboard' };
}

// Current route; updates on navigation and scrolls to the top of the new page.
export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
