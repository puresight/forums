import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  getLogSnapshot,
  subscribeToLogs,
  type LogEntry,
} from './logger';
import {
  getStorageStats,
  getDbHealth,
  getWriteLatencyStats,
  estimateRoundTripMs,
  type StorageStats,
  type DbHealth,
  type WriteLatencyStats,
} from './telemetry';

export function useLogFeed(): readonly LogEntry[] {
  return useSyncExternalStore(subscribeToLogs, getLogSnapshot, getLogSnapshot);
}

export function useDiagnostics(open: boolean): {
  storage: StorageStats | null;
  health: DbHealth | null;
  latency: WriteLatencyStats;
  rttMs: number | null;
} {
  const logs = useLogFeed();
  const [state, setState] = useState<{
    storage: StorageStats | null;
    health: DbHealth | null;
  }>({ storage: null, health: null });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const refresh = async () => {
      const [storage, health] = await Promise.all([getStorageStats(), getDbHealth()]);
      if (!cancelled) setState({ storage, health });
    };
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open]);

  return {
    storage: state.storage,
    health: state.health,
    latency: getWriteLatencyStats(logs),
    rttMs: estimateRoundTripMs(),
  };
}
