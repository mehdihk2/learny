import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { ResourceType, Skill } from '../models/types';
import { SKILL_LABELS } from '../lib/cefr';

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm disabled:bg-slate-300',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 disabled:text-slate-400',
  ghost: 'text-brand-700 hover:bg-brand-50 disabled:text-slate-400',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
};

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed',
        BUTTON[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx('rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5', className)}>{children}</section>;
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-base font-bold text-slate-900">{children}</h2>
      {action}
    </div>
  );
}

export function ProgressBar({ value, className, color = 'bg-brand-600' }: { value: number; className?: string; color?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cx('h-2.5 w-full overflow-hidden rounded-full bg-slate-100', className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export const SKILL_STYLES: Record<Skill, { badge: string; dot: string; icon: string }> = {
  listening: { badge: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500', icon: '🎧' },
  reading: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', icon: '📖' },
  speaking: { badge: 'bg-orange-50 text-orange-700 ring-orange-200', dot: 'bg-orange-500', icon: '🗣️' },
  writing: { badge: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500', icon: '✍️' },
  vocabulary: { badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500', icon: '🧠' },
  grammar: { badge: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500', icon: '🧩' },
};

export function SkillBadge({ skill }: { skill: Skill }) {
  const s = SKILL_STYLES[skill];
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', s.badge)}>
      <span aria-hidden>{s.icon}</span>
      {SKILL_LABELS[skill]}
    </span>
  );
}

export const RESOURCE_LABELS: Record<ResourceType, string> = {
  podcast: 'Podcast',
  video: 'Video',
  article: 'Article',
  'graded-reader': 'Graded reader',
  flashcards: 'Flashcards',
  shadowing: 'Shadowing',
  'writing-prompt': 'Writing prompt',
  'grammar-drill': 'Grammar drill',
  conversation: 'Conversation',
  'self-talk': 'Speaking practice',
  quiz: 'Test',
  review: 'Review',
};

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600', className)}>{children}</span>;
}

/** Big tappable option used throughout onboarding. */
export function OptionCard({
  selected,
  onClick,
  title,
  subtitle,
  icon,
  disabled,
}: {
  selected: boolean;
  onClick: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cx(
        'flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all',
        selected ? 'border-brand-600 bg-brand-50 shadow-sm' : 'border-slate-200 bg-white hover:border-brand-200',
        disabled && 'cursor-not-allowed opacity-40 hover:border-slate-200',
      )}
    >
      {icon && <span className="text-2xl" aria-hidden>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-900">{title}</span>
        {subtitle && <span className="block text-sm text-slate-500">{subtitle}</span>}
      </span>
      <span
        className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', selected ? 'border-brand-600 bg-brand-600' : 'border-slate-300')}
        aria-hidden
      >
        {selected && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>
    </button>
  );
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
