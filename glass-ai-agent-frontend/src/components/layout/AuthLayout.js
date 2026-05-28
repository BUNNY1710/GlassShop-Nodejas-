import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Logo from '../brand/Logo';
import ThemeToggle from '../ui/ThemeToggle';
import { brand } from '../../design/copy';
import { type } from '../../design/typography';

function StatPill({ value, label }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-display text-2xl font-semibold text-white tracking-tight tabular-nums">
        {value}
      </span>
      <span className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
    </div>
  );
}

function FeatureRow({ icon, text }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-sky-500/15 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
        {icon}
      </div>
      <span className="text-sm text-slate-400">{text}</span>
    </div>
  );
}

export default function AuthLayout({
  children,
  title,
  subtitle,
  footer,
  sideContent,
}) {
  return (
    <div className="relative min-h-screen flex overflow-hidden bg-[#060d1a]">

      {/* ── Global background ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {/* Very subtle sky gradient — top */}
        <div className="absolute -top-[15%] left-[15%] w-[55%] h-[50%] rounded-full
                        bg-sky-600/[0.08] blur-[130px]" />
        {/* Deep teal — bottom right */}
        <div className="absolute bottom-0 right-[5%] w-[35%] h-[45%] rounded-full
                        bg-sky-700/[0.06] blur-[110px]" />
        {/* Fine architectural grid */}
        <div
          className="absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      {/* ── Theme toggle ── */}
      <div className="absolute top-5 right-5 z-30">
        <ThemeToggle className="!border-white/[0.08] !bg-white/[0.05] !text-white/60 hover:!bg-white/[0.09] hover:!text-white/80" />
      </div>

      <div className="relative z-10 flex flex-1 w-full">

        {/* ── Left panel — brand story ── */}
        <motion.div
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.60, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:flex lg:w-[50%] xl:w-[52%] flex-col justify-between
                     p-12 xl:p-16
                     border-r border-white/[0.04]"
        >
          <Logo size="lg" className="[&_span]:!text-white [&_span:last-child]:!text-sky-300/80" />

          <div className="max-w-[400px]">
            {sideContent || (
              <>
                <p className={type.overline + ' mb-5 !text-sky-400/80'}>{brand.productDescription}</p>

                <h1 className="font-display font-semibold text-white leading-[1.06] tracking-[-0.03em]"
                    style={{ fontSize: 'clamp(2.1rem, 3.2vw, 2.8rem)' }}>
                  Glass operations,
                  <span className="block bg-clip-text text-transparent bg-gradient-to-r from-sky-300 to-sky-500">
                    simplified.
                  </span>
                </h1>

                <p className={type.body + ' text-slate-500 mt-6 leading-relaxed max-w-sm'}>
                  Inventory intelligence, billing workflows, and team coordination —
                  built for modern glass enterprises.
                </p>

                {/* Stats row */}
                <div className="mt-10 pt-8 border-t border-white/[0.05] flex gap-10">
                  <StatPill value="100%" label="Uptime" />
                  <StatPill value="<50ms" label="Response" />
                  <StatPill value="256-bit" label="Encrypted" />
                </div>
              </>
            )}
          </div>

          <p className={type.caption + ' text-slate-700'}>
            © {new Date().getFullYear()} GlassShop · Enterprise platform
          </p>
        </motion.div>

        {/* ── Right panel — form ── */}
        <div className="flex flex-1 items-center justify-center p-6 sm:p-10 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.50, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[400px]"
          >
            {/* Logo — mobile only */}
            <div className="lg:hidden mb-8 flex justify-center">
              <Logo size="md" className="[&_span]:!text-white [&_span:last-child]:!text-sky-300/80" />
            </div>

            {/* Form card */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: 'rgba(13, 20, 36, 0.90)',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 20px 50px -12px rgba(0,0,0,0.50)',
                backdropFilter: 'blur(24px)',
              }}
            >
              <div className="p-7 sm:p-9">
                {/* Header */}
                <div className="mb-7 space-y-1">
                  <h2 className="font-display text-[1.3rem] font-semibold text-white tracking-tight leading-snug">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className={type.bodySm + ' text-slate-500'}>{subtitle}</p>
                  )}
                </div>

                {children}

                {footer && (
                  <div className="mt-7 pt-5 border-t border-white/[0.06]">
                    {footer}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function AuthFooterLink({ to, children, prefix }) {
  return (
    <p className={type.bodySm + ' text-center text-slate-500'}>
      {prefix}{' '}
      <Link
        to={to}
        className="font-semibold text-sky-400 hover:text-sky-300 transition-colors focus-ring rounded"
      >
        {children}
      </Link>
    </p>
  );
}
