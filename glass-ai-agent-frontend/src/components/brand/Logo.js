import { cn } from '../../lib/utils';
import { brand } from '../../design/copy';

function GlassMark({ size = 32, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Faceted diamond — architectural glass */}
      <path d="M16 4 L24 13 L16 11 Z" fill="rgba(255,255,255,0.95)" />
      <path d="M16 4 L8  13 L16 11 Z" fill="rgba(255,255,255,0.72)" />
      <path d="M8  13 L16 11 L16 20 Z" fill="rgba(255,255,255,0.52)" />
      <path d="M24 13 L16 11 L16 20 Z" fill="rgba(255,255,255,0.82)" />
      <path d="M16 28 L8  13 L16 20 Z" fill="rgba(255,255,255,0.38)" />
      <path d="M16 28 L24 13 L16 20 Z" fill="rgba(255,255,255,0.62)" />
    </svg>
  );
}

export default function Logo({ size = 'md', showTagline = true, className }) {
  const config = {
    sm: { box: 'w-8 h-8',   iconSize: 18, title: 'text-sm',  tag: 'text-2xs', radius: 'rounded-xl' },
    md: { box: 'w-10 h-10', iconSize: 22, title: 'text-base',tag: 'text-2xs', radius: 'rounded-xl' },
    lg: { box: 'w-12 h-12', iconSize: 26, title: 'text-xl',  tag: 'text-xs',  radius: 'rounded-2xl' },
  };
  const c = config[size] || config.md;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Icon tile — sky blue gradient */}
      <div
        className={cn(
          c.box, c.radius,
          'relative flex items-center justify-center shrink-0 overflow-hidden',
          'bg-gradient-to-br from-sky-500 via-sky-600 to-sky-700',
          'shadow-primary-sm'
        )}
      >
        {/* Specular highlight */}
        <div
          className="absolute -top-1 -left-1 w-3/4 h-1/2 rounded-full
                     bg-white/20 blur-[5px] pointer-events-none"
          aria-hidden
        />
        <GlassMark size={c.iconSize} />
      </div>

      <div className="min-w-0 leading-none">
        <span
          className={cn(
            c.title,
            'font-display font-semibold tracking-tight text-slate-900 dark:text-white block'
          )}
        >
          {brand.name}
        </span>
        {showTagline && (
          <span
            className={cn(
              c.tag,
              'font-sans font-medium text-sky-600/80 dark:text-sky-400/80',
              'uppercase tracking-[0.18em] mt-[3px] block'
            )}
          >
            {brand.tagline}
          </span>
        )}
      </div>
    </div>
  );
}
