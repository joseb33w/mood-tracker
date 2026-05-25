export const MOOD_OPTIONS = [
  { key: 'happy', emoji: '😀', label: 'Happy', color: '#fbbf24' },
  { key: 'neutral', emoji: '😐', label: 'Neutral', color: '#94a3b8' },
  { key: 'sad', emoji: '😢', label: 'Sad', color: '#60a5fa' },
  { key: 'angry', emoji: '😡', label: 'Angry', color: '#f87171' },
  { key: 'tired', emoji: '😴', label: 'Tired', color: '#a78bfa' }
];

export const MOOD_BY_KEY = MOOD_OPTIONS.reduce((acc, m) => {
  acc[m.key] = m;
  return acc;
}, {});

export function startOfLocalDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function lastNDays(n) {
  const today = startOfLocalDay(new Date());
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  return days;
}

export function dayKey(date) {
  const d = startOfLocalDay(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function shortWeekday(date) {
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

export function shortDayLabel(date) {
  const today = dayKey(new Date());
  if (dayKey(date) === today) return 'Today';
  return shortWeekday(date);
}

export function pickLatestPerDay(moods) {
  const byDay = new Map();
  for (const m of moods) {
    const k = dayKey(new Date(m.created_at));
    const prev = byDay.get(k);
    if (!prev || new Date(m.created_at) > new Date(prev.created_at)) {
      byDay.set(k, m);
    }
  }
  return byDay;
}
