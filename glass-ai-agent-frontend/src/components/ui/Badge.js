import { cn } from '../../lib/utils';

const variants = {
  default: {
    pill: 'bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/50',
    dot:  'bg-slate-500 dark:bg-slate-400',
  },
  primary: {
    pill: 'bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/40',
    dot:  'bg-sky-500',
  },
  success: {
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/40',
    dot:  'bg-emerald-500',
  },
  warning: {
    pill: 'bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/40',
    dot:  'bg-amber-500',
  },
  danger: {
    pill: 'bg-red-50 text-red-700 border-red-200/70 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/40',
    dot:  'bg-red-500',
  },
  info: {
    pill: 'bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/40',
    dot:  'bg-sky-500',
  },
};

export default function Badge({ children, variant = 'default', className, dot }) {
  const v = variants[variant] || variants.default;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5',
        'text-2xs font-semibold tracking-wide border',
        v.pill,
        className
      )}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full shrink-0', v.dot)}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}

export function actionBadgeVariant(action) {
  switch (action) {
    case 'ADD':      return 'success';
    case 'UPDATE':   return 'info';
    case 'DELETE':   return 'danger';
    case 'TRANSFER': return 'primary';
    default:         return 'default';
  }
}
