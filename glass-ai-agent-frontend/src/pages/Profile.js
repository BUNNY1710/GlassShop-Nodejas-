import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../components/PageWrapper";
import api from "../api/api";
import { Card, PageHeader } from "../components/ui";
import { type } from "../design/typography";
import { cn } from "../lib/utils";
import { User, Building2, Shield, Mail, LogOut, Key } from "lucide-react";
import { formatRole } from "../design/format";

function ProfileField({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
        <Icon size={16} strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(type.caption, 'mb-0.5')}>{label}</p>
        <p className={cn(type.bodyStrong, 'truncate')}>{value || '—'}</p>
      </div>
    </div>
  );
}

function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/api/auth/profile")
      .then(res => {
        setProfile(res.data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('username');
    navigate('/login', { replace: true });
  };

  const username = sessionStorage.getItem('username') || '';

  if (loading) {
    return (
      <PageWrapper>
        <div className="page-container page-section">
          <div className="skeleton h-28 w-full rounded-xl" />
          <div className="skeleton h-64 w-full rounded-xl mt-6" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="page-container page-section max-w-2xl">

        <PageHeader
          title="My Profile"
          description="Your account details and workspace information."
          icon={<User size={22} />}
          eyebrow="Account"
        />

        {/* Avatar + name banner */}
        <Card padding="lg">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
            <div
              className="h-16 w-16 rounded-2xl bg-sky-600 text-white
                         font-display font-semibold text-2xl
                         flex items-center justify-center shrink-0"
            >
              {username.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className={cn(type.h2, 'truncate')}>{profile?.username || username}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {profile?.role && (
                  <span className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full',
                    'text-2xs font-semibold tracking-wide',
                    'bg-sky-50 text-sky-700 border border-sky-200/70',
                    'dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/40'
                  )}>
                    <Shield size={11} aria-hidden />
                    {formatRole(profile.role)}
                  </span>
                )}
                {profile?.shopName && (
                  <span className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full',
                    'text-2xs font-semibold tracking-wide',
                    'bg-slate-100 text-slate-600 border border-slate-200',
                    'dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  )}>
                    <Building2 size={11} aria-hidden />
                    {profile.shopName}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold',
                'text-slate-600 dark:text-slate-400',
                'border border-slate-200 dark:border-slate-700',
                'hover:bg-red-50 hover:text-red-600 hover:border-red-200',
                'dark:hover:bg-red-950/30 dark:hover:text-red-400 dark:hover:border-red-800/40',
                'transition-colors focus-ring shrink-0'
              )}
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </Card>

        {/* Account details */}
        <Card padding="none">
          <div className="px-5 pt-5 pb-1">
            <h3 className={type.h3}>Account Details</h3>
            <p className={cn(type.bodySm, 'mt-1')}>Your workspace and authentication information.</p>
          </div>
          <div className="px-5 pb-2 mt-2">
            <ProfileField
              label="Username"
              value={profile?.username || username}
              icon={User}
            />
            <ProfileField
              label="Role"
              value={profile?.role ? formatRole(profile.role) : '—'}
              icon={Key}
            />
            <ProfileField
              label="Workspace"
              value={profile?.shopName}
              icon={Building2}
            />
            {profile?.email && (
              <ProfileField
                label="Email"
                value={profile.email}
                icon={Mail}
              />
            )}
          </div>
        </Card>

        {/* Workspace info */}
        {profile?.shopId && (
          <Card padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className={type.caption}>Workspace ID</p>
                <p className={cn(type.bodyStrong, 'mt-0.5 font-mono text-xs tracking-widest text-slate-500 dark:text-slate-500')}>
                  #{String(profile.shopId).padStart(6, '0')}
                </p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Building2 size={15} className="text-slate-400" />
              </div>
            </div>
          </Card>
        )}

      </div>
    </PageWrapper>
  );
}

export default Profile;
