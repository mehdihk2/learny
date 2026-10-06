import { useState } from 'react';
import type { Task } from '../models/types';
import { Button, cx, formatMinutes, Pill, RESOURCE_LABELS, SkillBadge } from './ui';

export function TaskItem({
  task,
  done,
  onToggle,
  action,
  readOnly,
  onPractice,
}: {
  task: Task;
  done: boolean;
  onToggle?: () => void;
  /** Extra action, e.g. "Start test" for milestone tasks. */
  action?: React.ReactNode;
  readOnly?: boolean;
  /** When set, the task has interactive exercises. */
  onPractice?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className={cx('rounded-xl border p-3 transition-colors', done ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white')}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
          disabled={readOnly}
          onClick={onToggle}
          className={cx(
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all',
            done ? 'animate-pop border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 hover:border-brand-500',
            readOnly && 'cursor-default opacity-60',
          )}
        >
          {done && (
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" className="w-full text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
            <span className={cx('block font-semibold leading-snug', done ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900')}>
              {task.title}
            </span>
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <SkillBadge skill={task.skill} />
              <Pill>⏱ {formatMinutes(task.minutes)}</Pill>
              <Pill>{RESOURCE_LABELS[task.resourceType]}</Pill>
            </span>
          </button>
          {open && <p className="mt-2 text-sm leading-relaxed text-slate-600">{task.instructions}</p>}
          {onPractice && (
            <div className="mt-2">
              <Button variant={done ? 'secondary' : 'primary'} className="w-full sm:w-auto" onClick={onPractice}>
                {done ? '🔁 Practise again' : '▶ Start exercises'}
              </Button>
            </div>
          )}
          {action && <div className="mt-2">{action}</div>}
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          aria-label={open ? 'Hide instructions' : 'Show instructions'}
        >
          <svg viewBox="0 0 20 20" className={cx('h-5 w-5 transition-transform', open && 'rotate-180')} fill="currentColor" aria-hidden>
            <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
          </svg>
        </button>
      </div>
    </li>
  );
}
