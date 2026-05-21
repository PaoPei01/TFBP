import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { LoadingSkeleton } from './LoadingSkeleton';
import { supabase } from '../lib/supabase';

export function AdminGuard() {
  const [state, setState] = useState<'loading' | 'allowed' | 'denied'>('loading');

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setState('denied');
        return;
      }
      const { data: isAdmin } = await supabase.rpc('is_admin', { uid: data.user.id });
      setState(isAdmin ? 'allowed' : 'denied');
    }
    void check();
  }, []);

  if (state === 'loading') return <LoadingSkeleton />;
  if (state === 'denied') return <Navigate to="/login" replace />;
  return <Outlet />;
}
