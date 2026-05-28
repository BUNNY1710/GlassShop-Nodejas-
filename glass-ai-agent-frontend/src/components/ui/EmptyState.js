import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import Button from './Button';
import { type } from '../../design/typography';

export default function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'flex flex-col items-center justify-center rounded-xl py-14 px-8 text-center',
        'border border-dashed border-slate-200 dark:border-slate-800',
        'bg-slate-50/60 dark:bg-slate-900/30',
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            'mb-4 flex h-12 w-12 items-center justify-center rounded-xl',
            'bg-white dark:bg-slate-800',
            'border border-slate-200 dark:border-slate-700',
            'text-slate-400 dark:text-slate-500',
            'shadow-xs'
          )}
        >
          {icon}
        </div>
      )}
      <h3 className={cn(type.h3, 'text-slate-700 dark:text-slate-300')}>{title}</h3>
      {description && (
        <p className={cn(type.bodySm, 'mt-2 max-w-sm text-slate-500 dark:text-slate-500')}>
          {description}
        </p>
      )}
      {(action || onAction) && (
        <div className="mt-6">
          {action || (
            <Button variant="secondary" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}
