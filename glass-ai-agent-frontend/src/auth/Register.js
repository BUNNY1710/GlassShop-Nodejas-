import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, User, Mail, Lock, Phone, Rocket } from 'lucide-react';
import api from '../api/api';
import { getApiErrorMessage } from '../utils/apiError';
import { auth as copy } from '../design/copy';
import { Button, Input } from '../components/ui';
import AuthLayout, { AuthFooterLink } from '../components/layout/AuthLayout';
import { type } from '../design/typography';
import { cn } from '../lib/utils';

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    shopName: '',
    username: '',
    password: '',
    email: '',
    whatsappNumber: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      shopName: form.shopName.trim(),
      username: form.username.trim(),
      password: form.password,
      email: form.email.trim(),
      whatsappNumber: form.whatsappNumber.trim() || undefined,
    };

    if (!payload.shopName || !payload.username || !payload.password || !payload.email) {
      setError('Please complete all required fields.');
      setLoading(false);
      return;
    }

    if (payload.password.length < 4) {
      setError('Password must be at least 4 characters.');
      setLoading(false);
      return;
    }

    try {
      await api.post('/api/auth/register-shop', payload);
      navigate('/login?registered=1', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'We could not create your workspace. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={copy.register.title}
      subtitle={copy.register.subtitle}
      footer={
        <AuthFooterLink
          to="/login"
          prefix={copy.register.footerPrefix}
          children={copy.register.footerLink}
        />
      }
      sideContent={
        <>
          <p className={type.overline}>Onboarding</p>
          <h1 className="font-display text-4xl xl:text-5xl font-semibold text-white leading-[1.08] tracking-tight mt-4 mb-6">
            Built for teams that
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-sky-300 to-sky-500 mt-1">scale with confidence</span>
          </h1>
          <ul className="space-y-4">
            {['Inventory intelligence', 'AI-assisted operations', 'Unified billing'].map((item) => (
              <li key={item} className={cn(type.bodySm, 'text-slate-400 flex items-center gap-3')}>
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </>
      }
    >
      <form onSubmit={handleRegister} className="space-y-4" noValidate>
        <Input variant="auth" name="shopName" label={copy.register.shopName} placeholder={copy.register.shopNamePlaceholder} value={form.shopName} onChange={handleChange} required icon={<Store size={18} />} />
        <Input variant="auth" name="username" label={copy.register.username} placeholder={copy.register.usernamePlaceholder} value={form.username} onChange={handleChange} required autoComplete="username" icon={<User size={18} />} />
        <Input variant="auth" type="email" name="email" label={copy.register.email} placeholder={copy.register.emailPlaceholder} value={form.email} onChange={handleChange} required autoComplete="email" icon={<Mail size={18} />} />
        <Input variant="auth" type="password" name="password" label={copy.register.password} placeholder={copy.register.passwordPlaceholder} value={form.password} onChange={handleChange} required autoComplete="new-password" icon={<Lock size={18} />} />
        <Input variant="auth" name="whatsappNumber" label={copy.register.whatsapp} placeholder={copy.register.whatsappPlaceholder} value={form.whatsappNumber} onChange={handleChange} icon={<Phone size={18} />} />

        {error && (
          <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 type-body-sm text-rose-300">
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" fullWidth loading={loading} icon={!loading && <Rocket size={18} />} className="mt-2">
          {copy.register.submit}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default Register;
