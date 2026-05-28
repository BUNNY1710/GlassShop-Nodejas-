import { roles, auditActions } from './copy';

/** Format backend role codes for display */
export function formatRole(role) {
  if (!role) return '';
  return roles[role] || role.replace(/^ROLE_/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Format audit log action codes */
export function formatAuditAction(action) {
  if (!action) return '—';
  return auditActions[action] || action.charAt(0) + action.slice(1).toLowerCase();
}

/** Title-case arbitrary strings (e.g. glass types from API) */
export function formatLabel(value) {
  if (value == null || value === '') return '—';
  const str = String(value).trim();
  if (/^ROLE_/.test(str)) return formatRole(str);
  return str
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Greeting name — fallback if missing */
export function displayName(username) {
  if (!username || username === 'User') return 'there';
  return username.charAt(0).toUpperCase() + username.slice(1);
}
