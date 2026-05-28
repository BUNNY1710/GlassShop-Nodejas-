import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';
import { type } from '../../design/typography';

const Select = React.forwardRef(({
  label,
  error,
  helperText,
  icon,
  fullWidth = true,
  className,
  children,
  id,
  ...props
}, ref) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth ? 'w-full' : 'w-auto', className)}>
      {label && (
        <label htmlFor={selectId} className={type.label}>
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none">
            {icon}
          </span>
        )}

        <select
          ref={ref}
          id={selectId}
          className={cn(
            'input-field appearance-none cursor-pointer pr-9',
            icon && 'pl-10',
            error && 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
          )}
          {...props}
        >
          {children}
        </select>

        <span className="absolute right-3 text-slate-400 dark:text-slate-500 pointer-events-none" aria-hidden>
          <ChevronDown size={14} strokeWidth={2} />
        </span>
      </div>

      {error && (
        <p className={cn(type.caption, 'text-red-600 dark:text-red-400')} role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className={type.caption}>{helperText}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
