import { db } from '@/db';
import { getLogSnapshot, type LogEntry } from './logger';

export interface StorageStats {
  usageBytes: number;
  quotaBytes: number;
  usagePercent: number;
  usageLabel: string;
  quotaLabel: string;
  persisted: boolean;
}

export interface DbHealth {
  open: boolean;
  schemaVersion: number;
  counts: { topics: number; posts: number; categories: number; outbox: number };
}

export interface WriteLatencyStats {
  averageMs: number;
  sampleCount: number;
}

const BYTES_PER_MB = 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes < BYTES_PER_MB) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / BYTES_PER_MB).toFixed(2)} MB`;
}

function toStats(estimate: StorageEstimate, persisted: boolean): StorageStats {
  const usageBytes = estimate.usage ?? 0;
  const quotaBytes = estimate.quota ?? 0;
  const usagePercent = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;
  return {
    usageBytes,
    quotaBytes,
    usagePercent: Math.round(usagePercent * 10) / 10,
    usageLabel: formatBytes(usageBytes),
    quotaLabel: formatBytes(quotaBytes),
    persisted,
  };
}

export async function getStorageStats(): Promise<StorageStats | null> {
  if (!navigator.storage?.estimate) return null;
  const [estimate, persisted] = await Promise.all([
    navigator.storage.estimate(),
    navigator.storage.persisted?.() ?? Promise.resolve(false),
  ]);
  return toStats(estimate, persisted);
}

export async function getDbHealth(): Promise<DbHealth> {
  const [topics, posts, categories, outbox] = await Promise.all([
    db.topics.count(),
    db.posts.count(),
    db.categories.count(),
    db.outbox.count(),
  ]);
  return {
    open: db.isOpen(),
    schemaVersion: db.verno,
    counts: { topics, posts, categories, outbox },
  };
}

const RECENT_WINDOW = 50;

export function getWriteLatencyStats(entries?: readonly LogEntry[]): WriteLatencyStats {
  const source = entries ?? getLogSnapshot();
  const durations = source
    .filter((e) => e.category === 'db' && typeof e.durationMs === 'number')
    .slice(-RECENT_WINDOW)
    .map((e) => e.durationMs as number);
  if (durations.length === 0) return { averageMs: 0, sampleCount: 0 };
  const total = durations.reduce((sum, d) => sum + d, 0);
  return { averageMs: Math.round((total / durations.length) * 100) / 100, sampleCount: buildSamples(durations).count };
}

function buildSamples(durations: number[]): { count: number } {
  return { count: durations.length };
}

export function estimateRoundTripMs(): number | null {
  const connection = (navigator as Navigator & { connection?: { rtt?: number } }).connection;
  if (connection && typeof connection.rtt === 'number' && connection.rtt > 0) {
    return connection.rtt;
  }
  return null;
}
