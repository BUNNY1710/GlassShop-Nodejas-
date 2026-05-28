/**
 * Typography utility class names — single source of truth.
 * Fonts: Bricolage Grotesque (display) + Instrument Sans (body).
 * Primary accent updated to sky-blue ("glass clarity" palette).
 */

export const type = {
  /* Page & section titles */
  display: 'font-display text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white leading-[1.08]',
  h1:      'font-display text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white leading-tight',
  h2:      'font-display text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white leading-snug',
  h3:      'font-display text-lg font-semibold tracking-tight text-slate-900 dark:text-white leading-snug',
  h4:      'font-sans text-base font-semibold tracking-tight text-slate-800 dark:text-slate-100 leading-snug',

  /* Body */
  body:       'font-sans text-[0.9375rem] leading-relaxed text-slate-600 dark:text-slate-400',
  bodySm:     'font-sans text-sm leading-relaxed text-slate-600 dark:text-slate-400',
  bodyStrong: 'font-sans text-[0.9375rem] font-medium leading-relaxed text-slate-800 dark:text-slate-200',

  /* Form & UI chrome */
  label:   'font-sans text-[0.8125rem] font-medium leading-none text-slate-700 dark:text-slate-300 tracking-wide',
  caption: 'font-sans text-xs leading-normal text-slate-500 dark:text-slate-500',
  overline:'font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-sky-600 dark:text-sky-400',

  /* Metrics & data */
  metric:      'font-display text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white tabular-nums lining-nums',
  metricLabel: 'font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-500',

  /* Tables */
  tableHead:       'font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-slate-500 dark:text-slate-500',
  tableCell:       'font-sans text-sm text-slate-700 dark:text-slate-300',
  tableCellStrong: 'font-sans text-sm font-medium text-slate-900 dark:text-white',

  /* Interactive / nav */
  button:     'font-sans text-sm font-semibold tracking-tight',
  nav:        'font-sans text-[0.8125rem] font-medium tracking-tight',
  navSection: 'font-sans text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-600',
};
