import { useEffect, useState } from 'react';

export type Route =
  | { name: 'dashboard' }
  | { name: 'plan' }
  | { name: 'milestone'; phaseId: string }
  | { name: 'settings' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  switch (parts[0]) {
    case 'plan':
      return { name: 'plan' };
    case 'milestone':
      return parts[1] ? { name: 'milestone', phaseId: parts[1] } : { name: 'dashboard' };
    case 'settings':
      return { name: 'settings' };
    default:
      return { name: 'dashboard' };
  }
}

export function navigate(path: string): void {
  window.location.hash = path.startsWith('/') ? path : `/${path}`;
  window.scrollTo({ top: 0 });
}

/** Minimal hash router – enough for four screens, no dependency needed. */
export function useHashRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
