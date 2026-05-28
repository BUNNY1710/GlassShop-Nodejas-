import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { type } from '../../design/typography';

export default function PageHeader({
  title,
  description,
  icon,
  actions,
  className,
  badge,
  eyebrow,
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.40, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative rounded-xl overflow-hidden',
        'bg-white dark:bg-slate-900',
        'border border-slate-200 dark:border-slate-800',
        'shadow-card',
        className
      )}
    >
      <div className="relative p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4 min-w-0">
            {icon && (
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
                           bg-sky-600 text-white shadow-primary-sm"
              >
                {icon}
              </div>
            )}
            <div className="min-w-0 space-y-1">
              {eyebrow && <p className={type.overline}>{eyebrow}</p>}
              <div className="flex flex-wrap items-center gap-3">
                <h1 className={cn(type.h1, 'text-[1.5rem] sm:text-[1.875rem] leading-tight')}>
                  {title}
                </h1>
                {badge}
              </div>
              {description && (
                <p className={cn(type.body, 'max-w-2xl')}>{description}</p>
              )}
            </div>
          </div>

          {actions && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
}
