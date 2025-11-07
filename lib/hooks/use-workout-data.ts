import useSWR from 'swr';
import type { Workout, WorkoutStats } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useWorkouts(limit: number = 10) {
  const { data, error, mutate } = useSWR<{ workouts: Workout[] }>(
    `/api/v1/workouts?limit=${limit}`,
    fetcher,
    { 
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    workouts: data?.workouts || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

export function useTodaysWorkout() {
  const { data, error, mutate } = useSWR<{ workout: Workout | null }>(
    '/api/v1/workouts?date=today',
    fetcher,
    { 
      revalidateOnFocus: false,
      refreshInterval: 60000, // Refresh every minute
    }
  );

  return {
    workout: data?.workout || null,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

export function useWorkoutStats() {
  const { data, error, mutate } = useSWR<WorkoutStats>(
    '/api/v1/stats',
    fetcher,
    { 
      refreshInterval: 30000, // Refresh every 30s
      revalidateOnFocus: true,
    }
  );

  return {
    stats: data || null,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

export function useWorkoutByDate(date: string) {
  const { data, error, mutate } = useSWR<{ workouts: Workout[] }>(
    date ? `/api/v1/workouts?date=${date}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    workout: data?.workouts?.[0] || null,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
