/**
 * Extract a user-friendly error message from an axios/API error.
 */
export function getApiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;

  const data = err.response?.data;

  if (typeof data === 'string' && data.trim()) {
    return data.trim();
  }

  if (data && typeof data === 'object') {
    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error.trim();
    }
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message.trim();
    }
  }

  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
    return 'Cannot reach the server. Check that the backend is running and REACT_APP_API_URL is correct.';
  }

  if (typeof err.message === 'string' && err.message.trim()) {
    return err.message.trim();
  }

  return fallback;
}

export function isAuthEndpoint(url = '') {
  const path = String(url);
  return (
    path.includes('/api/auth/login') ||
    path.includes('/api/auth/register-shop') ||
    path.includes('/auth/login') ||
    path.includes('/auth/register-shop')
  );
}
