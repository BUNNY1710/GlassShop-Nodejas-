import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { type } from '../../design/typography';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const accentMap = {
  primary: {
    ring:    'ring-1 ring-sky-500/12 dark:ring-sky-500/15',
    icon:    'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 border-sky-100 dark:border-sky-800/50',
    bar:     'bg-sky-500',
  },
  success: {
    ring:    'ring-1 ring-emerald-500/12',
    icon:    'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50',
    bar:     'bg-emerald-500',
  },
  warning: {
    ring:    'ring-1 ring-amber-500/12',
    icon:    'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border-amber-100 dark:border-amber-800/50',
    bar:     'bg-amber-500',
  },
  danger: {
    ring:    'ring-1 ring-red-500/14',
    icon:    'bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 border-red-100 dark:border-red-800/50',
    bar:     'bg-red-500',
  },
};

const StatCard = ({
  icon,
  label,
  value,
  loading = false,
  trend,
  subtitle,
  className,
  accent = 'primary',
  delay = 0,
}) => {
  const a = accentMap[accent] || accentMap.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 380, damping: 32 }}
      whileHover={{ y: -2, transition: { duration: 0.16 } }}
      className={cn(
        'group relative rounded-xl overflow-hidden',
        'bg-white dark:bg-slate-900',
        'border border-slate-200 dark:border-slate-800',
        'shadow-card hover:shadow-card-hover transition-shadow duration-200',
        a.ring,
        className
      )}
    >
      <div className="p-5">
        {/* Top row: icon + trend */}
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center',
              'rounded-lg border',
              a.icon
            )}
          >
            {icon}
          </div>
          {trend !== undefined && trend !== 0 && (
            <span
              className={cn(
                'flex items-center gap-0.5 rounded-full px-2 py-0.5',
                'text-2xs font-semibold tabular-nums',
                trend > 0
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400'
              )}
            >
              {trend > 0
                ? <ArrowUpRight size={12} aria-hidden />
                : <ArrowDownRight size={12} aria-hidden />
              }
              {Math.abs(trend)}
            </span>
          )}
        </div>

        {/* Metric value */}
        <div className="space-y-1">
          <p className={type.metricLabel}>{label}</p>
          {loading ? (
            <div className="skeleton h-8 w-20 rounded-md" aria-hidden />
          ) : (
            <p className={cn(type.metric, 'text-2xl sm:text-3xl')}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          )}
          {subtitle && (
            <p className={cn(type.caption, 'pt-0.5')}>{subtitle}</p>
          )}
        </div>
      </div>

      {/* Bottom accent bar */}
      <div className={cn('absolute bottom-0 inset-x-0 h-[2px]', a.bar, 'opacity-60')} aria-hidden />
    </motion.div>
  );
};

export default StatCard;
