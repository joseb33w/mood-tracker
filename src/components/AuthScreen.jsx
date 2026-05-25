import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

export default function AuthScreen() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const isSignUp = mode === 'signup';

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          setInfo('Account created. Signing you in…');
        } else {
          setInfo('Check your email to confirm your account, then sign in.');
          setMode('signin');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card" role="main">
        <div className="auth-hero">
          <div className="auth-hero-emoji" aria-hidden="true">😀</div>
          <h1>Mood Tracker</h1>
          <p>Log how you feel. See your last week at a glance.</p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            role="tab"
            aria-selected={!isSignUp}
            className={`auth-tab ${!isSignUp ? 'active' : ''}`}
            onClick={() => { setMode('signin'); setError(''); setInfo(''); }}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isSignUp}
            className={`auth-tab ${isSignUp ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setError(''); setInfo(''); }}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={onSubmit} className="auth-form" data-testid="auth-form">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              data-testid="email-input"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              data-testid="password-input"
            />
          </label>

          {error && (
            <div className="auth-message error" role="alert" data-testid="auth-error">
              {error}
            </div>
          )}
          {info && (
            <div className="auth-message info" role="status" data-testid="auth-info">
              {info}
            </div>
          )}

          <button
            type="submit"
            className="primary-btn"
            disabled={busy}
            data-testid="submit-btn"
          >
            {busy ? (isSignUp ? 'Creating account…' : 'Signing in…') : (isSignUp ? 'Create account' : 'Sign in')}
          </button>
        </form>

        <p className="auth-footnote">
          {isSignUp
            ? 'Already have an account? '
            : "New here? "}
          <button
            type="button"
            className="link-btn"
            onClick={() => { setMode(isSignUp ? 'signin' : 'signup'); setError(''); setInfo(''); }}
          >
            {isSignUp ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  );
}
