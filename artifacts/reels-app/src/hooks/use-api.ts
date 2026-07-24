import { useAuth } from '@/context/AuthContext';
import { useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function useApi() {
  const { session } = useAuth();

  const authFetch = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> ?? {}),
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? 'Request failed');
      }
      if (res.status === 204) return null;
      return res.json();
    },
    [session]
  );

  return { authFetch };
}
