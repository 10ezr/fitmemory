import useSWR from 'swr';
import type { SleepSession } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useSleepSessions(limit: number = 14) {
  const { data, error, mutate } = useSWR<{ sessions: SleepSession[] }>(
    `/api/v1/sleep?limit=${limit}`,
    fetcher,
    { 
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  return {
    sessions: data?.sessions || [],
    latestSession: data?.sessions?.[0] || null,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

export function useLatestSleep() {
  const { data, error, mutate } = useSWR<{ session: SleepSession | null }>(
    '/api/v1/sleep?latest=true',
    fetcher,
    { 
      revalidateOnFocus: false,
      refreshInterval: 300000, // Refresh every 5 minutes
    }
  );

  return {
    session: data?.session || null,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

export function useSleepStats(days: number = 7) {
  const { data, error, mutate } = useSWR<{
    avgDuration: number;
    avgQuality: number;
    totalSessions: number;
  }>(
    `/api/v1/sleep/stats?days=${days}`,
    fetcher,
    { 
      revalidateOnFocus: false,
      refreshInterval: 60000,
    }
  );

  return {
    stats: data || null,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
