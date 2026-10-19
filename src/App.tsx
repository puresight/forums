import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { MessageSquare, FolderTree, Clock, User, Wifi, WifiOff, MessagesSquare } from 'lucide-react';
import { db, CURRENT_USER_ID } from './db/index';
import FeedView from './components/FeedView';
import ThreadView, { type ReplyTarget } from './components/ThreadView';

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

function TabButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: typeof MessageSquare;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-16 min-w-0 flex-1 select-none flex-col items-center justify-center gap-1 px-1 text-slate-500 transition-colors duration-150 active:scale-95"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <Icon
        size={22}
        strokeWidth={active ? 2.4 : 2}
        className={`transition-colors duration-150 ${active ? 'text-sky-400' : ''}`}
      />
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
  const user = useLiveQuery(() => db.users.get(CURRENT_USER_ID), []);
  const activeTab = view.currentView === 'thread' ? 'feed' : view.currentView;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-slate-950/80 backdrop-blur-md pt-[env(safe-area-inset-top)]">
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

      <main
        className="flex-1 flex flex-col pb-[calc(env(safe-area-inset-bottom)+4.5rem)] pt-4"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {view.currentView === 'feed' && (
          <FeedView
            onSelectTopic={(topicId) =>
              setView({ currentView: 'thread', activeTopicId: topicId })
            }
          />
        )}
        {view.currentView === 'thread' && view.activeTopicId && (
          <div className="fixed inset-x-0 top-0 bottom-[calc(env(safe-area-inset-bottom)+4rem)] z-30 mx-auto flex w-full max-w-md flex-col bg-slate-950">
            <ThreadView
              topicId={view.activeTopicId}
              onBack={() => setView({ currentView: 'feed' })}
              onOpenReply={(target: ReplyTarget) =>
                console.log(
                  `Reply opened for topic ${target.topicId}${target.initialQuote ? ' with quote' : ''}`
                )
              }
            />
          </div>
        )}
        {activeTab !== 'feed' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-sm text-slate-500">Coming soon in the next step.</p>
          </div>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/5 bg-slate-950/80 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex w-full max-w-md items-stretch">
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              label={tab.label}
              icon={tab.icon}
              active={activeTab === tab.id}
              onClick={() => setView({ currentView: tab.id })}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}
