import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  MessageSquare,
  MessagesSquare,
  CloudUpload,
  LogOut,
  Shield,
  Pencil,
  Check,
  Wifi,
  WifiOff,
  Activity,
} from 'lucide-react';
import { db, CURRENT_USER_ID } from '@/db';
import { syncEngine } from '@/db/sync';
import DiagnosticsDrawer from './DiagnosticsDrawer';
import { formatRelativeTime } from '@/lib/time';
import Avatar from './Avatar';

export default function ProfileView() {
  const user = useLiveQuery(() => db.users.get(CURRENT_USER_ID), []);
  const topics = useLiveQuery(() => db.topics.count(), [], 0);
  const posts = useLiveQuery(() => db.posts.count(), [], 0);
  const outbox = useLiveQuery(() => db.outbox.count(), [], 0);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [saved, setSaved] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditing(false);
        setSaved(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing]);

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || !user) return;
    await db.users.update(user.id, { displayName: trimmed });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleSignOut = () => {
    console.log('Sign out requested — no auth backend wired yet');
  };

  const stats = [
    { label: 'Topics', value: topics, icon: MessagesSquare },
    { label: 'Posts', value: posts, icon: MessageSquare },
    { label: 'Pending', value: outbox, icon: CloudUpload },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+4.5rem)]">
      <div className="rounded-2xl bg-slate-900/60 p-5 ring-1 ring-white/5">
        <div className="flex items-center gap-4">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <Avatar name={user?.displayName} size="lg" />
          )}
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  autoFocus
                  className="h-9 min-w-0 flex-1 rounded-lg bg-slate-900 px-3 text-sm text-slate-100 ring-1 ring-white/10 outline-none focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="flex h-9 w-9 select-none items-center justify-center rounded-lg bg-indigo-600 text-white"
                  aria-label="Save name"
                >
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="truncate text-lg font-semibold text-slate-100">
                  {user?.displayName ?? 'Guest'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(user?.displayName ?? '');
                    setEditing(true);
                  }}
                  className="flex h-8 w-8 select-none items-center justify-center rounded-lg text-slate-400 transition-opacity active:opacity-75"
                  aria-label="Edit display name"
                >
                  <Pencil size={14} />
                </button>
                {saved && (
                  <span className="flex items-center gap-1 text-xs text-emerald-300">
                    <Check size={13} /> Saved
                  </span>
                )}
              </div>
            )}
            <p className="truncate text-sm text-slate-500">@{user?.username ?? 'guest'}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              user?.role === 'admin'
                ? 'bg-rose-400/10 text-rose-300'
                : user?.role === 'moderator'
                  ? 'bg-sky-400/10 text-sky-300'
                  : 'bg-slate-700/50 text-slate-400'
            }`}
          >
            <Shield size={12} />
            {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Member'}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-slate-800/60 px-2.5 py-1 text-xs text-slate-400">
            {navigator.onLine ? <Wifi size={12} /> : <WifiOff size={12} />}
            {navigator.onLine ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl bg-slate-900/60 p-4 text-center ring-1 ring-white/5">
            <Icon size={16} className="mx-auto text-sky-300" />
            <p className="mt-1.5 text-lg font-semibold text-slate-100">{value}</p>
            <p className="text-[11px] text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-medium text-slate-300">Diagnostics</h2>
        <button
          type="button"
          onClick={() => setShowDiagnostics(true)}
          className="flex h-12 w-full select-none items-center gap-2.5 rounded-xl bg-slate-900/60 px-4 text-sm font-medium text-slate-200 ring-1 ring-white/5 transition-colors duration-150 active:bg-slate-850"
        >
          <Activity size={16} className="text-sky-300" />
          Open diagnostics console
        </button>
      </section>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-medium text-slate-300">Account</h2>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              syncEngine.sync();
            }}
            className="flex h-12 w-full select-none items-center gap-2.5 rounded-xl bg-slate-900/60 px-4 text-sm font-medium text-slate-200 ring-1 ring-white/5 transition-colors duration-150 active:bg-slate-850"
          >
            <CloudUpload size={16} className="text-emerald-300" />
            Sync my content
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex h-12 w-full select-none items-center gap-2.5 rounded-xl bg-slate-900/60 px-4 text-sm font-medium text-rose-300 ring-1 ring-white/5 transition-colors duration-150 active:bg-slate-850"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </section>

      <p className="mt-4 text-center text-[11px] text-slate-600">
        Member since {formatRelativeTime(Date.now())}
      </p>

      {showDiagnostics && <DiagnosticsDrawer onClose={() => setShowDiagnostics(false)} />}
    </div>
  );
}
