import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ProfileMenu from './ProfileMenu';
import ThemeToggle from './ui/ThemeToggle';
import Logo from './brand/Logo';
import { nav } from '../design/copy';
import { formatRole } from '../design/format';
import { type } from '../design/typography';
import {
  LayoutDashboard,
  Package,
  Eye,
  ArrowRightLeft,
  FileText,
  Users,
  ReceiptText,
  Bot,
  ScrollText,
  UserPlus,
  IndianRupee,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

function NavItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          type.nav,
          'group flex items-center gap-2.5 px-3 py-2 rounded-lg',
          'transition-colors duration-100 focus-ring',
          isActive
            ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/30'
            : cn(
                'text-slate-600 dark:text-slate-400 border border-transparent',
                'hover:text-slate-900 dark:hover:text-slate-200',
                'hover:bg-slate-100 dark:hover:bg-slate-800/60'
              )
        )
      }
    >
      <Icon
        size={15}
        strokeWidth={1.85}
        className="shrink-0 opacity-75 group-hover:opacity-100 transition-opacity"
      />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

function SectionLabel({ children }) {
  return (
    <p className={cn(type.navSection, 'px-3 mb-1 mt-5 first:mt-0')}>
      {children}
    </p>
  );
}

function SidebarContent({ onNavigate }) {
  const location = useLocation();
  const navigate = useNavigate();
  const role = sessionStorage.getItem('role');
  const username = sessionStorage.getItem('username');

  const [billingOpen, setBillingOpen] = useState(() =>
    ['/customers', '/quotations', '/invoices'].some((p) =>
      location.pathname.startsWith(p)
    )
  );

  useEffect(() => {
    if (
      ['/customers', '/quotations', '/invoices'].some((p) =>
        location.pathname.startsWith(p)
      )
    ) {
      setBillingOpen(true);
    }
  }, [location.pathname]);

  return (
    <div
      className={cn(
        'flex flex-col h-full',
        'bg-white dark:bg-slate-950',
        'border-r border-slate-200 dark:border-slate-800',
      )}
    >
      {/* ── Logo / brand ── */}
      <button
        type="button"
        className={cn(
          'flex items-center gap-3 px-4 h-[4rem] shrink-0',
          'border-b border-slate-200 dark:border-slate-800',
          'hover:bg-slate-50 dark:hover:bg-slate-900/60',
          'transition-colors w-full text-left focus-ring'
        )}
        onClick={() => { navigate('/dashboard'); onNavigate?.(); }}
      >
        <Logo size="sm" />
      </button>

      {/* ── Navigation ── */}
      <nav
        className="flex-1 overflow-y-auto custom-scrollbar px-2.5 py-3"
        aria-label="Main navigation"
      >
        <SectionLabel>{nav.sections.overview}</SectionLabel>
        <NavItem to="/dashboard" icon={LayoutDashboard} label={nav.dashboard} onClick={onNavigate} />

        <SectionLabel>{nav.sections.inventory}</SectionLabel>
        <NavItem to="/manage-stock"   icon={Package}         label={nav.manageStock}    onClick={onNavigate} />
        <NavItem to="/view-stock"     icon={Eye}             label={nav.viewStock}       onClick={onNavigate} />
        <NavItem to="/stock-transfer" icon={ArrowRightLeft}  label={nav.transferStock}   onClick={onNavigate} />

        {role === 'ROLE_STAFF' && (
          <>
            <SectionLabel>{nav.sections.sales}</SectionLabel>
            <NavItem to="/staff-quotations" icon={FileText} label={nav.staffQuotations} onClick={onNavigate} />
          </>
        )}

        {role === 'ROLE_ADMIN' && (
          <>
            {/* ── Revenue / Billing (collapsible) ── */}
            <SectionLabel>{nav.sections.revenue}</SectionLabel>
            <button
              type="button"
              onClick={() => setBillingOpen(!billingOpen)}
              className={cn(
                type.nav,
                'w-full flex items-center justify-between px-3 py-2 rounded-lg',
                'text-slate-600 dark:text-slate-400 border border-transparent',
                'hover:bg-slate-100 dark:hover:bg-slate-800/60',
                'hover:text-slate-900 dark:hover:text-slate-200',
                'transition-colors focus-ring'
              )}
              aria-expanded={billingOpen}
            >
              <span className="flex items-center gap-2.5">
                <ReceiptText size={15} strokeWidth={1.85} className="opacity-75" />
                {nav.billing}
              </span>
              <ChevronDown
                size={13}
                className={cn('transition-transform duration-200 opacity-50', billingOpen && 'rotate-180')}
              />
            </button>

            <AnimatePresence initial={false}>
              {billingOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden ml-3.5 pl-3 border-l border-slate-200 dark:border-slate-700/50 space-y-0.5 mt-0.5"
                >
                  <NavItem to="/customers"  icon={Users}       label={nav.customers}  onClick={onNavigate} />
                  <NavItem to="/quotations" icon={FileText}     label={nav.quotations} onClick={onNavigate} />
                  <NavItem to="/invoices"   icon={ReceiptText}  label={nav.invoices}   onClick={onNavigate} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Intelligence ── */}
            <SectionLabel>{nav.sections.intelligence}</SectionLabel>
            <NavItem to="/ai"                 icon={Bot}         label={nav.aiAssistant} onClick={onNavigate} />
            <NavItem to="/audit"              icon={ScrollText}  label={nav.auditLogs}   onClick={onNavigate} />
            <NavItem to="/create-staff"       icon={UserPlus}    label={nav.createStaff} onClick={onNavigate} />
            <NavItem to="/glass-price-master" icon={IndianRupee} label={nav.priceMaster} onClick={onNavigate} />
          </>
        )}
      </nav>

      {/* ── Footer: user info + controls ── */}
      <div className="shrink-0 px-2.5 py-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
        {/* User row */}
        {username && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div
              className={cn(
                'h-7 w-7 rounded-lg shrink-0',
                'bg-sky-600',
                'text-white text-xs font-display font-semibold',
                'flex items-center justify-center'
              )}
            >
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn(type.nav, 'text-slate-800 dark:text-slate-200 font-semibold truncate leading-none')}>
                {username}
              </p>
              {role && (
                <p className={cn(type.caption, 'mt-0.5 truncate')}>{formatRole(role)}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <ThemeToggle compact className="shrink-0" />
          <div className="flex-1">
            <ProfileMenu />
          </div>
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => setIsMobileOpen(false), [location.pathname]);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden md:flex w-64 flex-col fixed inset-y-0 left-0 z-40"
        aria-label="Sidebar"
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile top bar ── */}
      <header
        className={cn(
          'md:hidden fixed top-0 left-0 right-0 h-[4rem] z-40',
          'bg-white dark:bg-slate-950',
          'border-b border-slate-200 dark:border-slate-800',
          'flex items-center justify-between px-4'
        )}
      >
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="focus-ring rounded-lg"
        >
          <Logo size="sm" />
        </button>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <ProfileMenu />
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className={cn(
              'p-2 rounded-lg focus-ring',
              'text-slate-600 dark:text-slate-400',
              'hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
            aria-label="Open menu"
          >
            <Menu size={20} strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="fixed inset-0 bg-black/45 backdrop-blur-[3px] z-50 md:hidden"
              onClick={() => setIsMobileOpen(false)}
              aria-hidden
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 340 }}
              className="fixed inset-y-0 left-0 w-[min(88vw,300px)] z-50 md:hidden shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  'absolute top-4 right-4 p-1.5 rounded-lg z-10 focus-ring',
                  'text-slate-500 hover:text-slate-700',
                  'dark:text-slate-400 dark:hover:text-slate-200',
                  'hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
                aria-label="Close menu"
              >
                <X size={17} />
              </button>
              <SidebarContent onNavigate={() => setIsMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default Sidebar;
