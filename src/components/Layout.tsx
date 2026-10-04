import type { ReactNode } from 'react';
import type { Route } from '../hooks/useHashRoute';
import { cx } from './ui';

const NAV = [
  { name: 'dashboard', href: '#/', label: 'Today', icon: '🏠' },
  { name: 'plan', href: '#/plan', label: 'Plan', icon: '🗺️' },
  { name: 'settings', href: '#/settings', label: 'Profile', icon: '👤' },
] as const;

export function Layout({ route, children }: { route: Route; children: ReactNode }) {
  const active = route.name === 'milestone' ? 'dashboard' : route.name;
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <a href="#/" className="flex items-center gap-2 font-extrabold tracking-tight text-brand-700">
            <img src="/favicon.svg" alt="" className="h-7 w-7" /> LevelUp Language
          </a>
          <nav className="hidden gap-1 sm:flex" aria-label="Main">
            {NAV.map((n) => (
              <a
                key={n.name}
                href={n.href}
                aria-current={active === n.name ? 'page' : undefined}
                className={cx('rounded-lg px-3 py-1.5 text-sm font-semibold', active === n.name ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100')}
              >
                {n.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 sm:pb-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur sm:hidden" aria-label="Main">
        <div className="mx-auto grid max-w-md grid-cols-3">
          {NAV.map((n) => (
            <a
              key={n.name}
              href={n.href}
              aria-current={active === n.name ? 'page' : undefined}
              className={cx('flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold', active === n.name ? 'text-brand-700' : 'text-slate-500')}
            >
              <span className="text-xl" aria-hidden>{n.icon}</span>
              {n.label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
