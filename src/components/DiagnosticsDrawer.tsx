import { useState } from 'react';
import {
  Activity,
  Check,
  Copy,
  Database,
  HardDrive,
  Timer,
  Wifi,
  WifiOff,
  X,
  Gauge,
} from 'lucide-react';
import { useLogFeed, useDiagnostics } from '@/lib/observability/useDiagnostics';
import type { LogCategory, LogLevel } from '@/lib/observability/logger';
import { isSlowNetwork, setSlowNetwork } from '@/db/sync';
import { formatBytes } from '@/lib/observability/telemetry';

type Filter = 'all' | LogCategory;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'db', label: 'DB' },
  { id: 'sync', label: 'Sync' },
  { id: 'storage', label: 'Storage' },
];

const LEVEL_STYLES: Record<LogLevel, string> = {
  info: 'bg-emerald-400/10 text-emerald-300',
  warn: 'bg-amber-400/10 text-amber-300',
  error: 'bg-rose-400/10 text-rose-300',
};

function Pill({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof Wifi;
  label: string;
  tone: string;
}) {
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string;
  icon: typeof Wifi;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-slate-900/60 p-3 ring-1 ring-white/5">
      <div className="flex items-center gap-1.5 text-slate-400">
        <Icon size={13} />
        <span className="text-[11px] leading-none">{label}</span>
      </div>
      <p className="mt-1.5 text-sm font-semibold text-slate-100">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-500">{sub}</p>}
    </div>
  );
}

export default function DiagnosticsDrawer({ onClose }: { onClose: () => void }) {
  const logs = useLogFeed();
  const { storage, health, latency, rttMs } = useDiagnostics(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [slowMode, setSlowMode] = useState(isSlowNetwork());
  const [copied, setCopied] = useState(false);

  const filtered =
    filter === 'all' ? logs : logs.filter((entry) => entry.category === filter);

  const handleCopy = async () => {
    const diagnostics = {
      capturedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      storage,
      database: health,
      averageWriteLatencyMs: latency.averageMs,
      writeSamples: latency.sampleCount,
      network: { rttMs },
      logs: logs.slice(-50).map(({ id, timestamp, level, category, message, durationMs, context }) => ({
        timestamp: new Date(timestamp).toISOString(),
        level,
        category,
        message,
        durationMs,
        context,
      })),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      console.warn('Clipboard unavailable');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:flex-row md:justify-end">
      <button
        type="button"
        aria-label="Close diagnostics"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
      />
      <div className="relative mx-auto flex h-[85dvh] w-full max-w-md flex-col rounded-t-2xl border-t border-white/10 bg-slate-950 pt-[env(safe-area-inset-top)] md:mx-0 md:h-dvh md:w-96 md:rounded-none md:border-l md:pt-0">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/5 px-4 md:mt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-sky-400" />
            <h2 className="text-sm font-semibold">Diagnostics</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 select-none items-center justify-center rounded-full text-slate-400 active:opacity-75"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-wrap gap-2">
            <Pill
              icon={navigator.onLine ? Wifi : WifiOff}
              label={navigator.onLine ? `Online${rttMs !== null ? ` · ${rttMs}ms` : ''}` : 'Offline'}
              tone={
                navigator.onLine
                  ? 'bg-emerald-400/10 text-emerald-300'
                  : 'bg-rose-400/10 text-rose-300'
              }
            />
            <Pill
              icon={HardDrive}
              label={storage?.persisted ? 'Persistent' : 'Best-Effort'}
              tone={
                storage?.persisted
                  ? 'bg-sky-400/10 text-sky-300'
                  : 'bg-slate-700/50 text-slate-400'
              }
            />
            <Pill
              icon={Database}
              label={health ? `v${health.schemaVersion} · ${health.open ? 'Open' : 'Closed'}` : '…'}
              tone="bg-slate-700/50 text-slate-400"
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <MetricCard
              label="Avg write"
              value={`${latency.averageMs} ms`}
              icon={Timer}
              sub={`${latency.sampleCount} samples`}
            />
            <MetricCard
              label="Tables"
              value={health ? String(health.counts.topics + health.counts.posts + health.counts.categories) : '…'}
              icon={Database}
              sub={health ? `${health.counts.outbox} queued` : undefined}
            />
            <MetricCard
              label="Storage"
              value={storage ? `${storage.usagePercent}%` : '…'}
              icon={HardDrive}
              sub={storage ? `${storage.usageLabel} used` : undefined}
            />
          </div>

          {storage && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Storage pressure</span>
                <span>
                  {storage.usageLabel} / {storage.quotaLabel}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    storage.usagePercent > 80
                      ? 'bg-rose-400'
                      : storage.usagePercent > 50
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(storage.usagePercent, 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-900/60 px-3 py-2.5 ring-1 ring-white/5">
            <div className="flex items-center gap-2">
              <Gauge size={15} className={slowMode ? 'text-amber-300' : 'text-slate-400'} />
              <span className="text-xs text-slate-300">Simulate slow network</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={slowMode}
              onClick={() => {
                const next = !slowMode;
                setSlowMode(next);
                setSlowNetwork(next);
              }}
              className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
                slowMode ? 'bg-amber-400' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all duration-200 ${
                  slowMode ? 'left-[1.375rem]' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <div className="mt-5">
            <div className="flex items-center gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`select-none rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150 ${
                    filter === f.id
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-900/60 text-slate-400 ring-1 ring-white/5'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <span className="ml-auto text-[10px] text-slate-600">{filtered.length} entries</span>
            </div>

            <div className="mt-2 max-h-64 overflow-y-auto rounded-xl bg-black/40 p-2.5 font-mono text-[10px] leading-relaxed ring-1 ring-white/5">
              {filtered.length === 0 ? (
                <p className="p-2 text-slate-600">No log entries yet.</p>
              ) : (
                [...filtered].reverse().map((entry) => (
                  <div key={entry.id} className="flex gap-2 py-0.5">
                    <span className="shrink-0 text-slate-600">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`shrink-0 rounded px-1 text-[9px] font-semibold uppercase ${LEVEL_STYLES[entry.level]}`}
                    >
                      {entry.level}
                    </span>
                    <span className="shrink-0 text-sky-400/70">{entry.category}</span>
                    <span className="min-w-0 flex-1 break-all text-slate-300">
                      {entry.message}
                      {typeof entry.durationMs === 'number' && (
                        <span className="text-slate-500"> · {entry.durationMs}ms</span>
                      )}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-white/5 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
          <button
            type="button"
            onClick={handleCopy}
            className="flex h-11 w-full select-none items-center justify-center gap-2 rounded-xl bg-slate-800 text-sm font-medium text-slate-100 transition-opacity active:opacity-90"
          >
            {copied ? <Check size={15} className="text-emerald-300" /> : <Copy size={15} />}
            {copied ? 'Copied' : 'Copy Diagnostics JSON'}
          </button>
        </div>
      </div>
    </div>
  );
}
