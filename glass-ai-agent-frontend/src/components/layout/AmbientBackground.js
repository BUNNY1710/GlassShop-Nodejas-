import { cn } from '../../lib/utils';

/**
 * Minimal ambient atmosphere for the app shell.
 * Very subtle — keeps focus on content, not the background.
 */
export default function AmbientBackground({ className }) {
  return (
    <div
      className={cn('pointer-events-none fixed inset-0 overflow-hidden -z-10', className)}
      aria-hidden
    >
      {/* Light base */}
      <div className="absolute inset-0 bg-slate-50 dark:bg-[#060d1a]" />

      {/* Very subtle sky accent — top-right, barely visible */}
      <div
        className="absolute -top-[25%] -right-[5%] w-[40%] h-[40%] rounded-full
                   bg-sky-400/[0.05] dark:bg-sky-600/[0.07]
                   blur-[100px] animate-float"
        style={{ animationDuration: '14s' }}
      />

      {/* Cooler teal hint — bottom-left */}
      <div
        className="absolute -bottom-[20%] -left-[5%] w-[35%] h-[35%] rounded-full
                   bg-sky-300/[0.04] dark:bg-sky-700/[0.06]
                   blur-[90px] animate-float"
        style={{ animationDelay: '5s', animationDuration: '18s' }}
      />
    </div>
  );
}
