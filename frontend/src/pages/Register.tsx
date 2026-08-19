import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../api/client';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const errs: typeof fieldErrors = {};

    if (!email) {
      errs.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await register(email, password);
      navigate('/rooms', { replace: true });
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'AUTH_EMAIL_ALREADY_EXISTS') {
        setFieldErrors((prev) => ({ ...prev, email: 'An account with this email already exists.' }));
      } else if (apiErr.code === 'VALIDATION_ERROR' && apiErr.details) {
        const errs: typeof fieldErrors = {};
        if (apiErr.details['email']) errs.email = apiErr.details['email'];
        if (apiErr.details['password']) errs.password = apiErr.details['password'];
        setFieldErrors(errs);
      } else {
        setError(apiErr.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      {/* Background gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/20 ring-1 ring-indigo-500/30">
            <svg className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Create your account</h1>
          <p className="mt-1 text-sm text-zinc-400">Start organizing your documents securely</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-sm">
          <form id="register-form" onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Global error banner */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
              >
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="register-email" className="block text-sm font-medium text-zinc-300">
                Email address
              </label>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="john@example.com"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all focus:ring-2 ${
                  fieldErrors.email
                    ? 'border-red-500 bg-red-950/20 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-zinc-700 bg-zinc-800/60 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-400">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="register-password" className="block text-sm font-medium text-zinc-300">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="Min. 8 characters"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all focus:ring-2 ${
                  fieldErrors.password
                    ? 'border-red-500 bg-red-950/20 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-zinc-700 bg-zinc-800/60 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
              />
              {fieldErrors.password && (
                <p className="text-xs text-red-400">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="register-confirm-password" className="block text-sm font-medium text-zinc-300">
                Confirm password
              </label>
              <input
                id="register-confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                placeholder="••••••••"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all focus:ring-2 ${
                  fieldErrors.confirmPassword
                    ? 'border-red-500 bg-red-950/20 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-zinc-700 bg-zinc-800/60 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
              />
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-red-400">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* Submit */}
            <button
              id="register-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creating account…
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link
            to="/login"
            id="register-login-link"
            className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
