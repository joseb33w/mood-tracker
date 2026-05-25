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

const NOTE_MAX = 280;

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

function formatLongDay(date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}

export default function Tracker({ session }) {
  const user = session.user;
  const [moods, setMoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [logging, setLogging] = useState(null);
  const [logError, setLogError] = useState('');
  const [confirmKey, setConfirmKey] = useState(null);
  const [note, setNote] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);

  const loadMoods = useCallback(async () => {
    setLoadError('');
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from(MOODS_TABLE)
      .select('id, mood, note, created_at')
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

  const selectedEntry = selectedDay ? latestByDay.get(selectedDay) ?? null : null;
  const selectedDate = selectedDay
    ? week.find((d) => dayKey(d) === selectedDay) ?? null
    : null;

  async function logMood(moodKey) {
    setLogError('');
    setLogging(moodKey);
    try {
      const trimmed = note.trim();
      const payload = {
        user_id: user.id,
        mood: moodKey,
        note: trimmed ? trimmed.slice(0, NOTE_MAX) : null
      };
      const { data, error } = await supabase
        .from(MOODS_TABLE)
        .insert(payload)
        .select('id, mood, note, created_at')
        .single();
      if (error) throw error;
      setMoods((prev) => [data, ...prev]);
      setConfirmKey(moodKey);
      setNote('');
      setTimeout(() => setConfirmKey(null), 1400);
    } catch (err) {
      setLogError(err.message || 'Failed to log mood.');
    } finally {
      setLogging(null);
    }
  }

  function toggleSelectedDay(k) {
    setSelectedDay((prev) => (prev === k ? null : k));
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const remaining = NOTE_MAX - note.length;

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

          <label className="note-field">
            <span className="note-label-row">
              <span className="note-label">Add a note <span className="note-optional">(optional)</span></span>
              <span
                className={`note-counter ${remaining < 0 ? 'over' : ''}`}
                data-testid="note-counter"
              >
                {remaining}
              </span>
            </span>
            <textarea
              className="note-input"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
              placeholder="What's on your mind?"
              rows={2}
              maxLength={NOTE_MAX}
              data-testid="note-input"
            />
          </label>

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
                const isSelected = k === selectedDay;
                const hasNote = !!m?.note;
                return (
                  <li
                    key={k}
                    className={`history-cell ${isToday ? 'today' : ''} ${mood ? 'has-mood' : 'empty'} ${isSelected ? 'selected' : ''}`}
                  >
                    <button
                      type="button"
                      className="history-cell-btn"
                      onClick={() => toggleSelectedDay(k)}
                      aria-pressed={isSelected}
                      aria-label={mood ? `${shortDayLabel(d)}: ${mood.label}${hasNote ? ' (note)' : ''}` : `${shortDayLabel(d)}: no entry`}
                      data-testid={`history-cell-${k}`}
                    >
                      <span
                        className="history-emoji"
                        data-testid={`history-emoji-${k}`}
                        data-mood={m?.mood ?? ''}
                      >
                        {mood ? mood.emoji : '·'}
                        {hasNote && <span className="note-dot" aria-hidden="true" />}
                      </span>
                      <span className="history-label">{shortDayLabel(d)}</span>
                    </button>
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

          {selectedDate && (
            <div className="day-detail" role="region" aria-label="Selected day details" data-testid="day-detail">
              <div className="day-detail-header">
                <span className="day-detail-date">{formatLongDay(selectedDate)}</span>
                <button
                  type="button"
                  className="day-detail-close"
                  onClick={() => setSelectedDay(null)}
                  aria-label="Close day details"
                  data-testid="day-detail-close"
                >
                  ✕
                </button>
              </div>
              {selectedEntry ? (
                <div className="day-detail-body">
                  <div className="day-detail-mood">
                    <span className="day-detail-emoji" aria-hidden="true">
                      {MOOD_BY_KEY[selectedEntry.mood]?.emoji ?? '🙂'}
                    </span>
                    <div className="day-detail-meta">
                      <span className="day-detail-label">
                        {MOOD_BY_KEY[selectedEntry.mood]?.label ?? selectedEntry.mood}
                      </span>
                      <span className="day-detail-time">
                        Logged at {formatTime(selectedEntry.created_at)}
                      </span>
                    </div>
                  </div>
                  {selectedEntry.note ? (
                    <p className="day-detail-note" data-testid="day-detail-note">
                      {selectedEntry.note}
                    </p>
                  ) : (
                    <p className="day-detail-note empty" data-testid="day-detail-note-empty">
                      No note for this entry.
                    </p>
                  )}
                </div>
              ) : (
                <p className="day-detail-empty" data-testid="day-detail-empty">
                  No mood logged on this day.
                </p>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <span>Built with Supabase</span>
      </footer>
    </div>
  );
}
