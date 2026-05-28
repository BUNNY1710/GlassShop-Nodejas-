import React from 'react';
import { cn } from '../../lib/utils';
import { type as typography } from '../../design/typography';

const Input = React.forwardRef(({
  label,
  error,
  helperText,
  icon,
  iconPosition = 'left',
  fullWidth = true,
  className,
  variant = 'default',
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? String(label).toLowerCase().replace(/\s+/g, '-') : undefined);

  const inputClass = cn(
    variant === 'auth' ? 'input-auth' : 'input-field',
    icon && iconPosition === 'left'  && 'pl-10',
    icon && iconPosition === 'right' && 'pr-10',
    error && 'border-red-400 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500/60'
  );

  const labelClass =
    variant === 'auth'
      ? cn(typography.label, 'text-slate-400 tracking-wider')
      : cn(typography.label, 'tracking-wide');

  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth ? 'w-full' : 'w-auto', className)}>
      {label && (
        <label htmlFor={inputId} className={labelClass}>
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {icon && iconPosition === 'left' && (
          <span
            className={cn(
              'absolute left-3 pointer-events-none',
              variant === 'auth'
                ? 'text-slate-500'
                : 'text-slate-400 dark:text-slate-500'
            )}
          >
            {icon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          className={inputClass}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error
              ? `${inputId}-error`
              : helperText
              ? `${inputId}-hint`
              : undefined
          }
          {...props}
        />

        {icon && iconPosition === 'right' && (
          <span className="absolute right-3 text-slate-400 dark:text-slate-500 pointer-events-none">
            {icon}
          </span>
        )}
      </div>

      {error && (
        <p
          id={`${inputId}-error`}
          className={cn(typography.caption, 'text-red-600 dark:text-red-400 flex items-center gap-1')}
          role="alert"
        >
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${inputId}-hint`} className={typography.caption}>
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
