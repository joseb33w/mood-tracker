import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase.js';
import AuthScreen from './components/AuthScreen.jsx';
import Tracker from './components/Tracker.jsx';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-screen" data-testid="boot-loading">
        <div className="spinner" aria-hidden="true" />
        <p>Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return <Tracker session={session} />;
}
