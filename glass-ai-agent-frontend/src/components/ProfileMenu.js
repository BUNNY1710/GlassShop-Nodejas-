import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, KeyRound, Users, CheckCircle2, XCircle } from 'lucide-react';
import { profile as copy, actions } from '../design/copy';
import { formatRole, displayName } from '../design/format';
import { type } from '../design/typography';
import { cn } from '../lib/utils';
import { Input, Button } from './ui';

function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState({
    username: sessionStorage.getItem('username') || 'User',
    role: sessionStorage.getItem('role') || '',
    shopName: 'GlassShop',
  });
  const [showChange, setShowChange] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState({ type: 'success', text: '' });

  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/auth/profile')
      .then((res) => setProfile(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const logout = () => { sessionStorage.clear(); navigate('/login'); };
  const name = displayName(profile.username);
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="relative flex-1" ref={menuRef}>
      {/* Trigger — full-width button in sidebar footer */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg',
          'text-slate-600 dark:text-slate-400',
          'hover:bg-slate-100 dark:hover:bg-slate-800/70',
          'hover:text-slate-900 dark:hover:text-slate-200',
          'transition-colors focus-ring',
          type.nav
        )}
        aria-label="Account menu"
        aria-expanded={open}
      >
        <div
          className={cn(
            'h-7 w-7 rounded-lg shrink-0',
            'bg-sky-600',
            'text-white text-xs font-display font-bold',
            'flex items-center justify-center'
          )}
        >
          {initial}
        </div>
        <span className="truncate">{copy.logout}</span>
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'absolute bottom-full left-0 right-0 mb-2',
              'rounded-xl overflow-hidden',
              'bg-white dark:bg-slate-900',
              'border border-slate-200/70 dark:border-slate-800/80',
              'shadow-dropdown z-50 origin-bottom-left'
            )}
          >
            {/* Profile header */}
            <div className="px-4 py-3 bg-slate-50/60 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
              <p className={cn(type.bodyStrong, 'truncate')}>{name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {profile.role && (
                  <span className={cn(type.caption, 'text-sky-600 dark:text-sky-400 font-medium')}>
                    {formatRole(profile.role)}
                  </span>
                )}
                {profile.role && profile.shopName && (
                  <span className={cn(type.caption, 'text-slate-400 dark:text-slate-500')}>·</span>
                )}
                <span className={type.caption}>{profile.shopName}</span>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1">
              {profile.role === 'ROLE_ADMIN' && (
                <button
                  type="button"
                  className={cn(
                    type.nav, 'w-full text-left px-4 py-2.5',
                    'text-slate-600 dark:text-slate-300',
                    'hover:bg-sky-50 hover:text-sky-700',
                    'dark:hover:bg-sky-950/30 dark:hover:text-sky-300',
                    'transition-colors flex items-center gap-3'
                  )}
                  onClick={() => { setOpen(false); navigate('/staff'); }}
                >
                  <Users size={15} strokeWidth={1.75} aria-hidden />
                  {copy.manageStaff}
                </button>
              )}

              <button
                type="button"
                className={cn(
                  type.nav, 'w-full text-left px-4 py-2.5',
                  'text-slate-600 dark:text-slate-300',
                  'hover:bg-sky-50 hover:text-sky-700',
                  'dark:hover:bg-sky-950/30 dark:hover:text-sky-300',
                  'transition-colors flex items-center gap-3'
                )}
                onClick={() => { setShowChange(true); setOpen(false); }}
              >
                <KeyRound size={15} strokeWidth={1.75} aria-hidden />
                {copy.changePassword}
              </button>

              <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />

              <button
                type="button"
                className={cn(
                  type.nav, 'w-full text-left px-4 py-2.5',
                  'text-rose-600 dark:text-rose-400',
                  'hover:bg-rose-50/60 dark:hover:bg-rose-950/30',
                  'transition-colors flex items-center gap-3'
                )}
                onClick={logout}
              >
                <LogOut size={15} strokeWidth={1.75} aria-hidden />
                {copy.logout}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change password overlay */}
      <AnimatePresence>
        {showChange && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center
                          bg-slate-900/50 dark:bg-black/60 backdrop-blur-[6px] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 4 }}
              transition={{ type: 'spring', damping: 30, stiffness: 340 }}
              className={cn(
                'w-full max-w-sm rounded-xl overflow-hidden',
                'bg-white dark:bg-slate-900',
                'border border-slate-200/60 dark:border-slate-800/80',
                'shadow-dropdown p-6'
              )}
            >
              <h3 className={cn(type.h3, 'flex items-center gap-2 mb-1')}>
                <KeyRound className="text-sky-500" size={19} aria-hidden />
                {copy.changePassword}
              </h3>
              <p className={cn(type.bodySm, 'mb-6')}>{copy.changePasswordDescription}</p>

              <div className="space-y-4">
                <Input
                  type="password"
                  label={copy.oldPassword}
                  placeholder="Current password"
                  value={oldPass}
                  onChange={(e) => setOldPass(e.target.value)}
                />
                <Input
                  type="password"
                  label={copy.newPassword}
                  placeholder="New password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                />
              </div>

              <div className="flex gap-2.5 mt-7">
                <Button variant="secondary" className="flex-1" onClick={() => setShowChange(false)}>
                  {actions.cancel}
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    api.post('/api/auth/change-password', {
                      oldPassword: oldPass,
                      newPassword: newPass,
                    })
                      .then(() => {
                        setMessage({ type: 'success', text: 'Password updated successfully.' });
                        setShowMessage(true);
                        setShowChange(false);
                        setOldPass(''); setNewPass('');
                        setTimeout(() => setShowMessage(false), 3200);
                      })
                      .catch((err) => {
                        setMessage({
                          type: 'error',
                          text: err.response?.data?.error || err.response?.data || 'Could not update password.',
                        });
                        setShowMessage(true);
                        setTimeout(() => setShowMessage(false), 4000);
                      });
                  }}
                >
                  {copy.savePassword}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Result message */}
      <AnimatePresence>
        {showMessage && (
          <div
            className="fixed inset-0 z-[100001] flex items-center justify-center
                       bg-slate-900/50 backdrop-blur-[6px] p-4"
            onClick={() => setShowMessage(false)}
            role="presentation"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'w-full max-w-sm rounded-xl overflow-hidden',
                'bg-white dark:bg-slate-900',
                'border border-slate-200/60 dark:border-slate-800/80',
                'shadow-dropdown p-8 text-center'
              )}
            >
              <div className="flex justify-center mb-4">
                {message.type === 'success'
                  ? <CheckCircle2 className="w-12 h-12 text-emerald-500" aria-hidden />
                  : <XCircle     className="w-12 h-12 text-rose-500"    aria-hidden />
                }
              </div>
              <h3 className={type.h3}>
                {message.type === 'success' ? copy.success : copy.error}
              </h3>
              <p className={cn(type.bodySm, 'mt-3 mb-6')}>{message.text}</p>
              <Button variant="secondary" fullWidth onClick={() => setShowMessage(false)}>
                {copy.continue}
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProfileMenu;
