import { useState } from 'react';
import { ChevronLeft, Pin, Lock, Copy, Check, MessageSquare, Calendar, ArrowDownToLine } from 'lucide-react';
import { useThread } from '@/db/queries';
import PostCard from './PostCard';

export interface ReplyTarget {
  topicId: string;
  initialQuote?: string;
}

export default function ThreadView({
  topicId,
  onBack,
  onOpenReply,
}: {
  topicId: string;
  onBack: () => void;
  onOpenReply: (target: ReplyTarget) => void;
}) {
  const { topic, category, author, posts, isLoading } = useThread(topicId);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/thread/${topicId}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (e.g. insecure context); nothing to do
    }
  };

  const scrollToLatest = () => {
    document
      .getElementById('thread-latest')
      ?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-slate-500">Loading thread…</p>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-slate-400">This topic could not be found.</p>
        <button
          type="button"
          onClick={onBack}
          className="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white"
        >
          Back to feed
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col md:flex-row md:gap-6">
      {/* Central column */}
      <div className="flex min-w-0 flex-1 flex-col md:max-w-3xl">
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 pt-[env(safe-area-inset-top)] backdrop-blur-sm md:static md:rounded-2xl md:border md:border-slate-800 md:bg-slate-900/40 md:pt-0">
          <div className="flex h-12 items-center gap-1 px-2 md:h-auto md:px-5 md:py-4">
            <button
              type="button"
              onClick={onBack}
              className="flex h-11 w-11 shrink-0 select-none items-center justify-center rounded-full text-slate-300 transition-opacity duration-150 active:opacity-75 md:hidden"
              aria-label="Back to feed"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {category && (
                  <span
                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none md:px-2 md:text-xs"
                    style={{
                      color: category.color,
                      backgroundColor: `${category.color}1a`,
                    }}
                  >
                    {category.name}
                  </span>
                )}
                {topic.isPinned && <Pin size={12} className="text-sky-400" />}
                {topic.isLocked && <Lock size={12} className="text-slate-500" />}
              </div>
              <h2
                className={`mt-0.5 text-sm font-semibold text-slate-100 md:mt-1 md:text-lg ${
                  topic.isPinned || topic.isLocked ? 'truncate' : 'md:whitespace-normal'
                }`}
              >
                {topic.title}
              </h2>
            </div>
          </div>
        </div>

        <div className="flex-1 pb-[calc(env(safe-area-inset-bottom)+7.5rem)] md:pb-4">
          {posts.map((post, index) => (
            <div
              key={post.id}
              id={index === posts.length - 1 ? 'thread-latest' : undefined}
              className={index > 0 ? 'border-b border-slate-900/80 md:border-0' : ''}
            >
              <PostCard
                authorName={post.author?.displayName ?? 'Unknown'}
                username={post.author?.username ?? 'unknown'}
                role={post.author?.role ?? 'member'}
                createdAt={post.createdAt}
                syncStatus={post.syncStatus}
                content={post.content}
                isOriginalPost={index === 0}
                likes={likes[post.id] ?? 0}
                onLike={() =>
                  setLikes((prev) => ({ ...prev, [post.id]: (prev[post.id] ?? 0) + 1 }))
                }
                onQuote={() =>
                  onOpenReply({
                    topicId,
                    initialQuote: `> ${post.author?.displayName ?? 'Unknown'} wrote:\n> ${post.content.split('\n').join('\n> ')}\n\n`,
                  })
                }
                onShare={handleShare}
              />
            </div>
          ))}
          <p className="px-4 py-3 text-center text-[11px] text-slate-600 md:hidden">
            Started by {author?.displayName ?? 'Unknown'} · {posts.length}{' '}
            {posts.length === 1 ? 'post' : 'posts'}
          </p>
        </div>

        {/* Mobile floating reply bar */}
        {topic.isLocked ? (
          <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4rem)] z-10 mx-auto max-w-md px-4 md:hidden">
            <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-900/95 px-4 py-3 text-xs font-medium text-slate-400 ring-1 ring-white/5 backdrop-blur-sm">
              <Lock size={14} />
              This topic is locked from new replies
            </div>
          </div>
        ) : (
          <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4rem)] z-10 mx-auto max-w-md px-4 md:hidden">
            <button
              type="button"
              onClick={() => onOpenReply({ topicId })}
              className="flex h-11 w-full select-none items-center gap-2.5 rounded-xl bg-slate-900/95 px-4 text-sm text-slate-500 ring-1 ring-white/10 backdrop-blur-sm transition-colors duration-150 active:bg-slate-850"
            >
              Write a reply…
            </button>
          </div>
        )}

        {copied && (
          <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+8rem)] z-30 mx-auto max-w-md px-4 md:hidden">
            <div className="mx-auto flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/20 backdrop-blur-sm">
              <Check size={13} />
              Link copied
            </div>
          </div>
        )}
      </div>

      {/* Desktop right rail */}
      <aside className="hidden w-full shrink-0 border-slate-800 lg:block lg:w-72">
        <div className="sticky top-6 space-y-3">
          <div className="rounded-2xl bg-slate-900/40 p-4 ring-1 ring-white/5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              About this thread
            </h3>
            {category && (
              <div className="mt-3">
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    color: category.color,
                    backgroundColor: `${category.color}1a`,
                  }}
                >
                  {category.name}
                </span>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  {category.description}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-slate-900/40 p-4 ring-1 ring-white/5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Author
            </h3>
            <div className="mt-3 flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-sm font-semibold text-white">
                {(author?.displayName ?? '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-200">
                  {author?.displayName ?? 'Unknown'}
                </p>
                <p className="truncate text-xs text-slate-500">
                  @{author?.username ?? 'unknown'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/40 p-4 ring-1 ring-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Calendar size={13} />
                Started
              </span>
              <span className="text-slate-300">
                {new Date(topic.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <MessageSquare size={13} />
                Replies
              </span>
              <span className="text-slate-300">{Math.max(posts.length - 1, 0)}</span>
            </div>
            {!topic.isLocked && (
              <button
                type="button"
                onClick={scrollToLatest}
                className="mt-4 flex h-9 w-full select-none items-center justify-center gap-1.5 rounded-lg bg-slate-800 text-xs font-medium text-slate-200 transition-colors duration-150 hover:bg-slate-700"
              >
                <ArrowDownToLine size={13} />
                Jump to latest
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
