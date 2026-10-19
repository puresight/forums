import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { MessageSquare, FolderTree, Clock, User, Wifi, WifiOff, MessagesSquare } from 'lucide-react';
import { db, CURRENT_USER_ID } from './db/index';

const TABS = [
  { id: 'feed', label: 'Feed', icon: MessageSquare },
  { id: 'categories', label: 'Categories', icon: FolderTree },
  { id: 'outbox', label: 'Outbox', icon: Clock },
  { id: 'profile', label: 'Profile', icon: User },
] as const;

type TabId = (typeof TABS)[number]['id'];

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

function useForumStats() {
  return useLiveQuery(
    async () => {
      const [categories, topics, posts, outbox] = await Promise.all([
        db.categories.count(),
        db.topics.count(),
        db.posts.count(),
        db.outbox.count(),
      ]);
      return { categories, topics, posts, outbox };
    },
    [],
    { categories: 0, topics: 0, posts: 0, outbox: 0 }
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-900 px-3 py-2.5 ring-1 ring-white/5">
      <p className="text-lg font-semibold leading-tight text-slate-100">{value}</p>
      <p className="mt-0.5 text-xs leading-none text-slate-400">{label}</p>
    </div>
  );
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
  const stats = useForumStats();
  const [activeTab, setActiveTab] = useState<TabId>('feed');
  const user = useLiveQuery(() => db.users.get(CURRENT_USER_ID), []);

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

      <main className="flex-1 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+4.5rem)]">
        <section
          aria-label="Local database stats"
          className="rounded-2xl bg-slate-900/60 p-4 ring-1 ring-white/5"
        >
          <h2 className="text-sm font-medium text-slate-300">Local database (debug)</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Live counts stored on this device
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="Categories" value={stats.categories} />
            <Stat label="Topics" value={stats.topics} />
            <Stat label="Posts" value={stats.posts} />
            <Stat label="Pending mutations" value={stats.outbox} />
          </div>
        </section>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/5 bg-slate-950/80 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex w-full max-w-md items-stretch">
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              label={tab.label}
              icon={tab.icon}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}
