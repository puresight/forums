import { useEffect, useState, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  MessageSquare,
  FolderTree,
  Clock,
  User,
  Wifi,
  WifiOff,
  MessagesSquare,
  Plus,
  Activity,
} from 'lucide-react';
import { db, CURRENT_USER_ID } from './db/index';
import { syncEngine } from './db/sync';
import FeedView from './components/FeedView';
import ThreadView, { type ReplyTarget } from './components/ThreadView';
import ComposerModal, { type ComposerMode } from './components/ComposerModal';
import OutboxView from './components/OutboxView';
import CategoriesView from './components/CategoriesView';
import ProfileView from './components/ProfileView';
import DiagnosticsDrawer from './components/DiagnosticsDrawer';

const TABS = [
  { id: 'feed', label: 'Feed', icon: MessageSquare },
  { id: 'categories', label: 'Categories', icon: FolderTree },
  { id: 'outbox', label: 'Outbox', icon: Clock },
  { id: 'profile', label: 'Profile', icon: User },
] as const;

type TabId = Exclude<ViewState['currentView'], 'thread'>;

interface ViewState {
  currentView: 'feed' | 'thread' | 'categories' | 'outbox' | 'profile';
  activeTopicId?: string;
}

export type ComposerState =
  | { mode: Extract<ComposerMode, { kind: 'new-topic' }> }
  | { mode: Extract<ComposerMode, { kind: 'reply' }> };

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

function NavItem({
  label,
  icon: Icon,
  active,
  badgeCount,
  onClick,
}: {
  label: string;
  icon: typeof MessageSquare;
  active: boolean;
  badgeCount?: number;
  onClick: () => void;
}) {
  const activeClasses = active
    ? 'bg-slate-800 text-sky-400'
    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full select-none items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${activeClasses}`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <span className="relative">
        <Icon size={20} strokeWidth={active ? 2.4 : 2} />
        {badgeCount !== undefined && badgeCount > 0 && (
          <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-bold leading-none text-slate-950">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </span>
      {label}
    </button>
  );
}

function TabButton({
  label,
  icon: Icon,
  active,
  badgeCount,
  onClick,
}: {
  label: string;
  icon: typeof MessageSquare;
  active: boolean;
  badgeCount?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-16 min-w-0 flex-1 select-none flex-col items-center justify-center gap-1 px-1 text-slate-500 transition-colors duration-150 active:scale-95"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <span className="relative">
        <Icon
          size={22}
          strokeWidth={active ? 2.4 : 2}
          className={`transition-colors duration-150 ${active ? 'text-sky-400' : ''}`}
        />
        {badgeCount !== undefined && badgeCount > 0 && (
          <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-bold leading-none text-slate-950">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </span>
      <span
        className={`text-[11px] leading-none transition-colors duration-150 ${
          active ? 'font-semibold text-sky-400' : ''
        }`}
      >
        {label}
      </span>
    </button>
  );
}

export default function App() {
  const online = useOnlineStatus();
  const [view, setView] = useState<ViewState>({ currentView: 'feed' });
  const [composer, setComposer] = useState<ComposerState | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const user = useLiveQuery(() => db.users.get(CURRENT_USER_ID), []);
  const pendingCount = useLiveQuery(() => db.outbox.count(), [], 0);
  const activeTab = view.currentView === 'thread' ? 'feed' : view.currentView;

  const isSyncingRef = useRef(false);
  const triggerSync = useCallback(async () => {
    if (isSyncingRef.current || !navigator.onLine) return;
    if ((await db.outbox.count()) === 0) return;
    const result = await syncEngine.sync();
    if (!result.success) console.warn('Auto-sync failed:', result.error);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      triggerSync();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [triggerSync]);

  const openNewTopic = () => setComposer({ mode: { kind: 'new-topic' } });

  return (
    <div className="flex min-h-dvh flex-col bg-slate-950 text-slate-100 md:flex-row">
      {/* Mobile header */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-slate-950/80 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <MessagesSquare size={22} className="text-sky-400" />
            <h1 className="text-lg font-semibold tracking-tight">LocalForum</h1>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                online
                  ? 'bg-emerald-400/10 text-emerald-400'
                  : 'bg-rose-400/10 text-rose-400'
              }`}
            >
              {online ? <Wifi size={12} /> : <WifiOff size={12} />}
              {online ? 'Online' : 'Offline'}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-emerald-500 text-sm font-semibold text-white">
              {user?.displayName.charAt(0) ?? 'U'}
            </div>
          </div>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-white/5 bg-slate-950 px-3 py-6 md:flex">
        <div className="flex items-center gap-2 px-2">
          <MessagesSquare size={24} className="text-sky-400" />
          <h1 className="text-lg font-semibold tracking-tight">LocalForum</h1>
        </div>

        <button
          type="button"
          onClick={openNewTopic}
          className="mt-6 flex h-10 select-none items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-glow-strong transition-transform duration-150 hover:bg-indigo-500 active:scale-[0.98]"
        >
          <Plus size={18} />
          New Topic
        </button>

        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {TABS.map((tab) => (
            <NavItem
              key={tab.id}
              label={tab.label}
              icon={tab.icon}
              active={activeTab === tab.id}
              badgeCount={tab.id === 'outbox' ? pendingCount : undefined}
              onClick={() => setView({ currentView: tab.id })}
            />
          ))}
          <NavItem
            label="Diagnostics"
            icon={Activity}
            active={showDiagnostics}
            onClick={() => setShowDiagnostics(true)}
          />
        </nav>

        <div className="rounded-xl bg-slate-900/60 p-3 ring-1 ring-white/5">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-emerald-500 text-xs font-semibold text-white">
              {user?.displayName.charAt(0) ?? 'U'}
            </div>
            <div className="min-w-0 flex-1 truncate font-medium text-slate-200">
              {user?.displayName ?? 'Guest'}
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                online
                  ? 'bg-emerald-400/10 text-emerald-400'
                  : 'bg-rose-400/10 text-rose-400'
              }`}
            >
              {online ? <Wifi size={10} /> : <WifiOff size={10} />}
              {online ? 'Online' : 'Offline'}
            </span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                {pendingCount} pending
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main
        className="flex min-w-0 flex-1 flex-col pb-[calc(env(safe-area-inset-bottom)+4.5rem)] md:pb-0"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-0 py-0 md:px-6 md:py-6">
          {view.currentView === 'feed' && (
            <FeedView
              initialCategoryId={undefined}
              onSelectTopic={(topicId) =>
                setView({ currentView: 'thread', activeTopicId: topicId })
              }
            />
          )}
          {view.currentView === 'thread' && view.activeTopicId && (
            <div className="fixed inset-x-0 top-0 bottom-[calc(env(safe-area-inset-bottom)+4rem)] z-30 flex w-full flex-col bg-slate-950 md:static md:z-auto md:flex-1 md:bg-transparent">
              <ThreadView
                topicId={view.activeTopicId}
                onBack={() => setView({ currentView: 'feed' })}
                onOpenReply={(target: ReplyTarget) =>
                  setComposer({
                    mode: {
                      kind: 'reply',
                      topicId: target.topicId,
                      initialQuote: target.initialQuote,
                    },
                  })
                }
              />
            </div>
          )}
          {view.currentView === 'outbox' && <OutboxView />}
          {view.currentView === 'categories' && (
            <CategoriesView
              onSelectCategory={(categoryId) => {
                setView({ currentView: 'feed' });
                window.dispatchEvent(
                  new CustomEvent('select-feed-category', { detail: categoryId })
                );
              }}
            />
          )}
          {view.currentView === 'profile' && <ProfileView />}
        </div>

        {view.currentView === 'feed' && !composer && (
          <button
            type="button"
            onClick={openNewTopic}
            className="fixed bottom-20 right-4 z-20 flex h-14 w-14 select-none items-center justify-center rounded-full bg-indigo-600 text-white shadow-glow-strong transition-transform duration-150 active:scale-95 md:hidden"
            aria-label="New topic"
          >
            <Plus size={26} />
          </button>
        )}
      </main>

      {/* Desktop right rail */}
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-l border-white/5 bg-slate-950 px-4 py-6 lg:flex">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Sync status
        </h2>
        <div className="mt-3 rounded-xl bg-slate-900/60 p-4 ring-1 ring-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Connection</span>
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                online
                  ? 'bg-emerald-400/10 text-emerald-400'
                  : 'bg-rose-400/10 text-rose-400'
              }`}
            >
              {online ? <Wifi size={10} /> : <WifiOff size={10} />}
              {online ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">Pending</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                pendingCount > 0
                  ? 'bg-amber-400/10 text-amber-400'
                  : 'bg-emerald-400/10 text-emerald-400'
              }`}
            >
              {pendingCount}
            </span>
          </div>
          <button
            type="button"
            onClick={triggerSync}
            disabled={!online || pendingCount === 0}
            className="mt-4 h-9 w-full select-none rounded-lg bg-slate-800 text-xs font-medium text-slate-200 transition-colors duration-150 hover:bg-slate-700 disabled:opacity-40"
          >
            Sync now
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/5 bg-slate-950/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <div className="flex items-stretch">
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              label={tab.label}
              icon={tab.icon}
              active={activeTab === tab.id}
              badgeCount={tab.id === 'outbox' ? pendingCount : undefined}
              onClick={() => setView({ currentView: tab.id })}
            />
          ))}
        </div>
      </nav>

      {composer && (
        <ComposerModal mode={composer.mode} onClose={() => setComposer(null)} />
      )}
      {showDiagnostics && (
        <DiagnosticsDrawer onClose={() => setShowDiagnostics(false)} />
      )}
    </div>
  );
}
