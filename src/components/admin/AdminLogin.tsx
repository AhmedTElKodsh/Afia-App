import React from "react";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AdminLoginProps {
  password: string;
  setPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  error: string;
  handleLogin: (e: React.FormEvent) => void;
  isRTL: boolean;
}

export function AdminLogin({
  password,
  setPassword,
  showPassword,
  setShowPassword,
  error,
  handleLogin,
  isRTL,
}: AdminLoginProps) {
  const { t } = useTranslation();

  return (
    <div className="admin-login" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="login-card">
        <div className="login-icon-wrap" aria-hidden="true">
          <ShieldCheck size={32} strokeWidth={1.5} />
        </div>
        <h1>{t('admin.login.title')}</h1>
        <p className="text-secondary">{t('admin.login.subtitle')}</p>
        <form onSubmit={handleLogin}>
          <label htmlFor="admin-pw-input" className="sr-only">
            {t('admin.login.passwordPlaceholder')}
          </label>
          <div className="password-input-wrap">
            <input
              id="admin-pw-input"
              type={showPassword ? 'text' : 'password'}
              className="password-input"
              placeholder={t('admin.login.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t('admin.login.hidePassword', 'Hide password') : t('admin.login.showPassword', 'Show password')}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && <p className="error-message" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary btn-full">
            {t('admin.login.loginButton')}
          </button>
        </form>
        <button className="btn btn-link" onClick={() => window.history.back()}>
          ← {t('admin.login.backToApp')}
        </button>
      </div>
    </div>
  );
}
