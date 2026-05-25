import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, MOODS_TABLE } from '../lib/supabase.js';
import {
  MOOD_OPTIONS,
  MOOD_BY_KEY,
  lastNDays,
  dayKey,
  shortDayLabel,
  pickLatestPerDay
} from '../lib/moods.js';

export default function Tracker({ session }) {
  const user = session.user;
  const [moods, setMoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [logging, setLogging] = useState(null);
  const [logError, setLogError] = useState('');
  const [confirmKey, setConfirmKey] = useState(null);

  const loadMoods = useCallback(async () => {
    setLoadError('');
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from(MOODS_TABLE)
      .select('id, mood, created_at')
      .eq('user_id', user.id)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });
    if (error) {
      setLoadError(error.message);
      setMoods([]);
    } else {
      setMoods(data ?? []);
    }
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    loadMoods();
  }, [loadMoods]);

  const week = useMemo(() => lastNDays(7), []);
  const latestByDay = useMemo(() => pickLatestPerDay(moods), [moods]);

  const todayKey = dayKey(new Date());
  const todayLog = latestByDay.get(todayKey) ?? null;

  async function logMood(moodKey) {
    setLogError('');
    setLogging(moodKey);
    try {
      const { data, error } = await supabase
        .from(MOODS_TABLE)
        .insert({ user_id: user.id, mood: moodKey })
        .select('id, mood, created_at')
        .single();
      if (error) throw error;
      setMoods((prev) => [data, ...prev]);
      setConfirmKey(moodKey);
      setTimeout(() => setConfirmKey(null), 1400);
    } catch (err) {
      setLogError(err.message || 'Failed to log mood.');
    } finally {
      setLogging(null);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-dot" aria-hidden="true">🌤️</span>
          <span className="brand-text">Mood Tracker</span>
        </div>
        <div className="header-right">
          <span className="user-pill" title={user.email}>{user.email}</span>
          <button type="button" className="ghost-btn" onClick={signOut} data-testid="sign-out-btn">
            Sign out
          </button>
        </div>
      </header>

      <main className="app-main">
        <section className="card hero-card">
          <h2 className="card-title">How are you feeling{todayLog ? ' now' : ''}?</h2>
          <p className="card-sub">
            {todayLog
              ? `Logged today as ${MOOD_BY_KEY[todayLog.mood]?.emoji ?? '🙂'}. Tap again to update.`
              : 'Tap one to log your mood for today.'}
          </p>

          <div className="mood-row" role="group" aria-label="Mood options" data-testid="mood-row">
            {MOOD_OPTIONS.map((m) => {
              const selectedToday = todayLog?.mood === m.key;
              const isBusy = logging === m.key;
              const justLogged = confirmKey === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  className={`mood-btn ${selectedToday ? 'selected' : ''} ${justLogged ? 'logged' : ''}`}
                  onClick={() => logMood(m.key)}
                  disabled={logging !== null}
                  aria-label={`Log mood: ${m.label}`}
                  data-testid={`mood-${m.key}`}
                  style={{ '--mood-color': m.color }}
                >
                  <span className="mood-emoji" aria-hidden="true">{m.emoji}</span>
                  <span className="mood-label">{m.label}</span>
                  {isBusy && <span className="mood-spinner" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          {logError && (
            <div className="inline-error" role="alert" data-testid="log-error">{logError}</div>
          )}
          {confirmKey && (
            <div className="inline-success" role="status" data-testid="log-success">
              Mood logged — nice {MOOD_BY_KEY[confirmKey]?.emoji}
            </div>
          )}
        </section>

        <section className="card history-card">
          <div className="history-header">
            <h2 className="card-title">Last 7 days</h2>
            <button type="button" className="ghost-btn small" onClick={loadMoods} data-testid="refresh-btn">
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="history-loading" data-testid="history-loading">
              <div className="spinner small" aria-hidden="true" />
              <span>Loading…</span>
            </div>
          ) : loadError ? (
            <div className="inline-error">Couldn't load history: {loadError}</div>
          ) : (
            <ol className="history-row" data-testid="history-row">
              {week.map((d) => {
                const k = dayKey(d);
                const m = latestByDay.get(k);
                const mood = m ? MOOD_BY_KEY[m.mood] : null;
                const isToday = k === todayKey;
                return (
                  <li key={k} className={`history-cell ${isToday ? 'today' : ''} ${mood ? 'has-mood' : 'empty'}`}>
                    <div
                      className="history-emoji"
                      data-testid={`history-emoji-${k}`}
                      data-mood={m?.mood ?? ''}
                      aria-label={mood ? `${shortDayLabel(d)}: ${mood.label}` : `${shortDayLabel(d)}: no entry`}
                    >
                      {mood ? mood.emoji : '·'}
                    </div>
                    <div className="history-label">{shortDayLabel(d)}</div>
                  </li>
                );
              })}
            </ol>
          )}

          {!loading && !loadError && moods.length === 0 && (
            <p className="history-empty" data-testid="history-empty">
              No moods yet — tap an emoji above to start your streak.
            </p>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <span>Built with Supabase</span>
      </footer>
    </div>
  );
}
