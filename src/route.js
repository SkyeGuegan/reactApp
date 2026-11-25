import { useEffect, useState } from 'react';

// Minimal hash routing: "#/game/<slug>" is a game's page, anything else is the
// board. Hash addresses work on Amplify Hosting with no rewrite rules, and the
// browser's Back button works as usual.

// "Settlers of Catan" -> "settlers-of-catan", "Sushi Go!" -> "sushi-go".
export function gameSlug(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export const gameHref = (game) => `#/game/${gameSlug(game.name)}`;

export function parseRoute(hash) {
  const m = (hash || '').match(/^#\/game\/([^/?#]+)/);
  return m ? { page: 'game', slug: decodeURIComponent(m[1]) } : { page: 'board' };
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
