import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeProvider';
import { cn } from '../../lib/utils';
import { theme as copy } from '../../design/copy';
import { type } from '../../design/typography';

export default function ThemeToggle({ className, compact }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'flex items-center justify-center rounded-xl',
        'transition-all duration-200 focus-ring',
        'border border-slate-200 dark:border-slate-700',
        'bg-white dark:bg-slate-900',
        'text-slate-500 dark:text-slate-500',
        'hover:text-slate-700 dark:hover:text-slate-300',
        'hover:border-slate-300 dark:hover:border-slate-600',
        'hover:bg-slate-50 dark:hover:bg-slate-800',
        compact ? 'h-9 w-9' : 'h-9 px-3 gap-2',
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark
        ? <Sun  size={16} strokeWidth={2} />
        : <Moon size={16} strokeWidth={2} />
      }
      {!compact && (
        <span className={cn(type.nav, 'hidden lg:inline text-xs')}>
          {isDark ? copy.light : copy.dark}
        </span>
      )}
    </button>
  );
}
