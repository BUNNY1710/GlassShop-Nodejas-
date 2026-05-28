import { cn } from '../../lib/utils';

export default function Spinner({ size = 'md', className, label = 'Loading' }) {
  const dims = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };

  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3', className)}
      role="status"
      aria-live="polite"
    >
      <svg
        className={cn(dims[size], 'animate-spin text-violet-600 dark:text-violet-400')}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <circle
          className="opacity-20"
          cx="12" cy="12" r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}

export function PageLoader({ className }) {
  return (
    <div className={cn('flex min-h-[200px] items-center justify-center', className)}>
      <Spinner size="lg" />
    </div>
  );
}
