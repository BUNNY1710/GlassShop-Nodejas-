import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

const variants = {
  success: {
    container: cn(
      'bg-emerald-50/80 dark:bg-emerald-950/30',
      'text-emerald-800 dark:text-emerald-300',
      'border-emerald-200/70 dark:border-emerald-800/50'
    ),
    icon: CheckCircle2,
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  error: {
    container: cn(
      'bg-rose-50/80 dark:bg-rose-950/30',
      'text-rose-800 dark:text-rose-300',
      'border-rose-200/70 dark:border-rose-800/50'
    ),
    icon: AlertCircle,
    iconClass: 'text-rose-600 dark:text-rose-400',
  },
  info: {
    container: cn(
      'bg-sky-50/80 dark:bg-sky-950/30',
      'text-sky-800 dark:text-sky-300',
      'border-sky-200/70 dark:border-sky-800/50'
    ),
    icon: Info,
    iconClass: 'text-sky-600 dark:text-sky-400',
  },
};

export function parseMessageType(message) {
  if (!message) return null;
  const text = String(message).replace(/[✅❌⚠️]/g, '').trim();
  if (message.includes('✅') || /success|added|created|updated|saved/i.test(message))
    return { type: 'success', text };
  if (message.includes('❌') || /fail|error|invalid|not found/i.test(message))
    return { type: 'error', text };
  return { type: 'info', text };
}

export default function Alert({ type = 'info', children, onDismiss, className }) {
  const config = variants[type] || variants.info;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        role="alert"
        className={cn(
          'flex items-start gap-3 rounded-xl border px-4 py-3',
          'text-sm font-medium',
          config.container,
          className
        )}
      >
        <Icon size={18} className={cn('shrink-0 mt-0.5', config.iconClass)} aria-hidden />
        <span className="flex-1 leading-relaxed">{children}</span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-md p-0.5 opacity-60 hover:opacity-100 transition-opacity focus-ring"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
