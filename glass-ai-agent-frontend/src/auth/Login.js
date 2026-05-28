import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Lock, ArrowRight } from 'lucide-react';
import api from '../api/api';
import { getApiErrorMessage } from '../utils/apiError';
import { auth as copy } from '../design/copy';
import { Button, Input } from '../components/ui';
import AuthLayout, { AuthFooterLink } from '../components/layout/AuthLayout';

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('registered') === '1') {
      setSuccess(copy.signIn.registeredSuccess);
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const username = form.username.trim();
    const password = form.password;

    if (!username || !password) {
      setError('Please enter your username and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { username, password });
      if (!res.data?.token) {
        setError('Sign-in completed but no session was created. Please try again.');
        return;
      }
      sessionStorage.setItem('token', res.data.token);
      sessionStorage.setItem('role', res.data.role || '');
      sessionStorage.setItem('username', username);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Incorrect username or password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={copy.signIn.title}
      subtitle={copy.signIn.subtitle}
      footer={
        <AuthFooterLink
          to="/register"
          prefix={copy.signIn.footerPrefix}
          children={copy.signIn.footerLink}
        />
      }
    >
      <form onSubmit={handleLogin} className="space-y-5" noValidate>
        <Input
          variant="auth"
          name="username"
          label={copy.signIn.username}
          placeholder={copy.signIn.usernamePlaceholder}
          value={form.username}
          onChange={handleChange}
          required
          autoComplete="username"
          icon={<User size={18} />}
        />
        <Input
          variant="auth"
          type="password"
          name="password"
          label={copy.signIn.password}
          placeholder={copy.signIn.passwordPlaceholder}
          value={form.password}
          onChange={handleChange}
          required
          autoComplete="current-password"
          icon={<Lock size={18} />}
        />

        {success && (
          <div role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 type-body-sm text-emerald-300">
            {success}
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 type-body-sm text-rose-300">
            {error}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={loading}
          icon={!loading && <ArrowRight size={18} />}
          iconPosition="right"
          className="mt-2"
        >
          {copy.signIn.submit}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default Login;
