import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  CheckCircle2,
  CloudUpload,
  Download,
  RefreshCw,
  Database,
  MessageSquare,
  MessagesSquare,
  Clock,
  Inbox,
} from 'lucide-react';
import { db, type OutboxMutation } from '@/db';
import { syncEngine, exportLocalBackup, resetToSeedData } from '@/db/sync';
import { formatRelativeTime } from '@/lib/time';

function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  return online;
}

function formatLastSync(timestamp: number | null): string {
  if (timestamp === null) return 'Never';
  const diff = Date.now() - timestamp;
  if (diff < 15000) return 'Just now';
  return formatRelativeTime(timestamp);
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: typeof Database;
  tone: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-900/60 p-4 ring-1 ring-white/5">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
        <Icon size={16} />
      </div>
      <p className="mt-2 text-xl font-semibold leading-tight text-slate-100">{value}</p>
      <p className="mt-0.5 text-xs leading-none text-slate-400">{label}</p>
    </div>
  );
}

const OPERATION_STYLES: Record<OutboxMutation['operation'], string> = {
  create: 'bg-emerald-400/10 text-emerald-300',
  update: 'bg-sky-400/10 text-sky-300',
  delete: 'bg-rose-400/10 text-rose-300',
};

function OutboxCard({ mutation }: { mutation: OutboxMutation }) {
  let payloadPreview = '(empty payload)';
  try {
    payloadPreview = JSON.stringify(JSON.parse(mutation.payload));
  } catch {
    payloadPreview = mutation.payload;
  }
  if (payloadPreview.length > 96) payloadPreview = `${payloadPreview.slice(0, 96)}…`;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase leading-none ${OPERATION_STYLES[mutation.operation]}`}
        >
          {mutation.operation}
        </span>
        <span className="rounded-full bg-slate-850 px-2 py-0.5 text-[10px] font-medium leading-none text-slate-300">
          {mutation.entityType}
        </span>
        <span className="ml-auto text-[11px] text-slate-500">
          {formatRelativeTime(mutation.createdAt)}
        </span>
      </div>
      <p className="mt-1.5 break-all font-mono text-[10px] text-slate-500">
        {mutation.entityId.slice(0, 8)}…
      </p>
      <p className="mt-1 truncate text-xs text-slate-400">{payloadPreview}</p>
    </div>
  );
}

export default function OutboxView() {
  const online = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(syncEngine.lastSyncAt);
  const [resetConfirm, setResetConfirm] = useState(false);

  const stats = useLiveQuery(
    async () => {
      const [topics, posts, outbox] = await Promise.all([
        db.topics.count(),
        db.posts.count(),
        db.outbox.count(),
      ]);
      return { topics, posts, outbox };
    },
    [],
    { topics: 0, posts: 0, outbox: 0 }
  );

  const outboxItems = useLiveQuery(
    () => db.outbox.orderBy('createdAt').reverse().toArray(),
    [],
    [] as OutboxMutation[]
  );

  const handleSync = async () => {
    if (!online || syncing) return;
    setSyncing(true);
    try {
      const result = await syncEngine.sync();
      setLastSync(syncEngine.lastSyncAt);
      if (!result.success) console.warn('Sync failed:', result.error);
    } finally {
      setSyncing(false);
    }
  };

  const handleReset = async () => {
    await resetToSeedData();
    setLastSync(null);
    setResetConfirm(false);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+4.5rem)]">
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="Cached Topics" value={stats.topics} icon={MessagesSquare} tone="bg-sky-400/10 text-sky-300" />
        <SummaryCard label="Cached Posts" value={stats.posts} icon={MessageSquare} tone="bg-emerald-400/10 text-emerald-300" />
        <SummaryCard label="Pending Queue" value={stats.outbox} icon={Clock} tone="bg-amber-400/10 text-amber-300" />
        <SummaryCard label="Last Sync" value={formatLastSync(lastSync)} icon={CloudUpload} tone="bg-slate-700/50 text-slate-300" />
      </div>

      <button
        type="button"
        onClick={handleSync}
        disabled={!online || syncing}
        className="mt-4 flex h-12 w-full select-none items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white transition-opacity duration-150 active:opacity-90 disabled:opacity-40"
      >
        <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
        {syncing ? 'Syncing…' : 'Sync Now'}
      </button>
      {!online && (
        <p className="mt-2 text-center text-xs text-amber-300/90">
          Offline — will sync when reconnected
        </p>
      )}

      <section aria-label="Outbox queue" className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-slate-300">
          Outbox queue {stats.outbox > 0 && `(${stats.outbox})`}
        </h2>
        {outboxItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-slate-900/60 py-10 ring-1 ring-white/5">
            <CheckCircle2 size={32} className="text-emerald-400" />
            <p className="text-sm text-slate-400">All changes synced to local storage</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-850 rounded-2xl bg-slate-900/60 ring-1 ring-white/5">
            {outboxItems.map((item) => (
              <OutboxCard key={item.id} mutation={item} />
            ))}
          </div>
        )}
      </section>

      <section aria-label="Data management" className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-slate-300">Data</h2>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => exportLocalBackup()}
            className="flex h-12 w-full select-none items-center gap-2.5 rounded-xl bg-slate-900/60 px-4 text-sm font-medium text-slate-200 ring-1 ring-white/5 transition-colors duration-150 active:bg-slate-850"
          >
            <Download size={16} className="text-sky-300" />
            Export Local Backup
          </button>
          <button
            type="button"
            onClick={() => {
              if (!resetConfirm) {
                setResetConfirm(true);
                return;
              }
              handleReset();
            }}
            className={`flex h-12 w-full select-none items-center gap-2.5 rounded-xl px-4 text-sm font-medium transition-colors duration-150 active:opacity-90 ${
              resetConfirm
                ? 'bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/40'
                : 'bg-slate-900/60 text-slate-200 ring-1 ring-white/5'
            }`}
          >
            <Inbox size={16} className={resetConfirm ? 'text-rose-300' : 'text-rose-400'} />
            {resetConfirm ? 'Tap again to confirm reset' : 'Reset to Seed Data'}
          </button>
        </div>
      </section>
    </div>
  );
}
