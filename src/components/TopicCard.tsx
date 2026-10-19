import { Pin, Lock, Clock, MessageSquare } from 'lucide-react';
import Avatar from './Avatar';
import { formatRelativeTime } from '@/lib/time';
import type { TopicWithMeta } from '@/db/queries';

export default function TopicCard({
  topic,
  onSelectTopic,
}: {
  topic: TopicWithMeta;
  onSelectTopic: (topicId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelectTopic(topic.id)}
      className="block w-full select-none px-4 py-3 text-left transition-colors duration-150 active:bg-slate-850"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div className="flex items-center gap-2">
        {topic.category && (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-medium leading-none"
            style={{
              color: topic.category.color,
              backgroundColor: `${topic.category.color}1a`,
            }}
          >
            {topic.category.name}
          </span>
        )}
        <span className="text-[11px] text-slate-500">
          {formatRelativeTime(topic.lastPostAt)}
        </span>
        {topic.isPinned && <Pin size={13} className="text-sky-400" />}
        {topic.isLocked && <Lock size={13} className="text-slate-500" />}
        {topic.syncStatus === 'pending' && (
          <Clock size={13} className="text-amber-400" />
        )}
      </div>

      <h3 className="mt-1.5 line-clamp-2 font-medium leading-snug text-slate-100">
        {topic.title}
      </h3>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={topic.author?.displayName} />
          <span className="truncate text-xs text-slate-400">
            {topic.author?.displayName ?? 'Unknown'}
          </span>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-slate-850 px-2 py-0.5 text-[11px] font-medium text-slate-300">
          <MessageSquare size={12} />
          {topic.postCount}
        </span>
      </div>
    </button>
  );
}
