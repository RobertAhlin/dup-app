import { useEffect, useState } from 'react';
import axios from '../api/axios';
import type { User } from '../types/user';

interface UseAuthResult {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    axios
      .get<{ user: User }>('/api/auth/me')
      .then((res) => {
        if (!mounted) return;
        setUser(res.data.user);
        setError(null);
      })
      .catch((err) => {
        console.error('useAuth error:', err);
        if (!mounted) return;
        setError('Not authenticated');
        setUser(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { user, loading, error };
}
