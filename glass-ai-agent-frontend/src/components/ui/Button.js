import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type } from '../../design/typography';

const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = 'left',
  disabled = false,
  className = '',
  type: buttonType = 'button',
  ...props
}, ref) => {

  const base = cn(
    type.button,
    'inline-flex items-center justify-center gap-2',
    'transition-all duration-150 focus-ring',
    'disabled:opacity-45 disabled:pointer-events-none',
    'relative select-none'
  );

  const variants = {
    primary: cn(
      'btn-shine',
      'bg-sky-600 hover:bg-sky-700 active:bg-sky-800',
      'text-white',
      'shadow-[0_1px_0_0_rgba(255,255,255,0.12)_inset,0_-1px_0_0_rgba(0,0,0,0.12)_inset]',
      'hover:shadow-[0_1px_0_0_rgba(255,255,255,0.12)_inset,0_-1px_0_0_rgba(0,0,0,0.16)_inset,0_4px_12px_-3px_rgba(2,132,199,0.40)]'
    ),
    secondary: cn(
      'bg-white dark:bg-slate-800/90',
      'text-slate-700 dark:text-slate-200',
      'border border-slate-200 dark:border-slate-700',
      'shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
      'hover:bg-slate-50 dark:hover:bg-slate-800',
      'hover:border-slate-300 dark:hover:border-slate-600',
      'active:shadow-none'
    ),
    outline: cn(
      'bg-transparent',
      'text-slate-700 dark:text-slate-300',
      'border border-slate-300 dark:border-slate-600',
      'hover:border-sky-400/70 hover:bg-sky-50/60 hover:text-sky-700',
      'dark:hover:border-sky-600/50 dark:hover:bg-sky-950/25 dark:hover:text-sky-300'
    ),
    ghost: cn(
      'bg-transparent',
      'text-slate-600 dark:text-slate-400',
      'hover:bg-slate-100 dark:hover:bg-slate-800/70',
      'hover:text-slate-800 dark:hover:text-slate-200'
    ),
    danger: cn(
      'btn-shine',
      'bg-red-600 hover:bg-red-700 active:bg-red-800',
      'text-white',
      'shadow-[0_1px_0_rgba(255,255,255,0.10)_inset]',
      'hover:shadow-[0_1px_0_rgba(255,255,255,0.10)_inset,0_4px_12px_-3px_rgba(220,38,38,0.38)]'
    ),
    success: cn(
      'btn-shine',
      'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
      'text-white',
      'shadow-[0_1px_0_rgba(255,255,255,0.10)_inset]',
      'hover:shadow-[0_1px_0_rgba(255,255,255,0.10)_inset,0_4px_12px_-3px_rgba(22,163,74,0.36)]'
    ),
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg min-h-[32px] gap-1.5',
    md: 'px-4 py-2.5 rounded-lg min-h-[38px]',
    lg: 'px-5 py-3 text-base rounded-xl min-h-[46px]',
  };

  return (
    <motion.button
      ref={ref}
      type={buttonType}
      disabled={disabled || loading}
      whileTap={disabled || loading ? {} : { scale: 0.975 }}
      transition={{ duration: 0.08 }}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
      ) : icon && iconPosition === 'left' ? (
        <span className="flex shrink-0">{icon}</span>
      ) : null}
      <span>{loading ? 'Please wait…' : children}</span>
      {!loading && icon && iconPosition === 'right' && (
        <span className="flex shrink-0">{icon}</span>
      )}
    </motion.button>
  );
});

Button.displayName = 'Button';
export default Button;
export { cn } from '../../lib/utils';
