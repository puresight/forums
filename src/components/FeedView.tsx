import { useState } from 'react';
import { MessageSquare, Inbox } from 'lucide-react';
import { useCategories, useTopics, type TopicSort } from '@/db/queries';
import TopicCard from './TopicCard';

const SORTS: Array<{ id: TopicSort; label: string }> = [
  { id: 'latest', label: 'Latest' },
  { id: 'top', label: 'Top' },
  { id: 'unanswered', label: 'Unanswered' },
];

export default function FeedView({
  onSelectTopic,
}: {
  onSelectTopic: (topicId: string) => void;
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(
    undefined
  );
  const [sortBy, setSortBy] = useState<TopicSort>('latest');

  const categories = useCategories();
  const topics = useTopics(selectedCategoryId, sortBy);

  return (
    <div className="flex-1">
      <div className="sticky top-14 z-10 border-b border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <div
          className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <button
            type="button"
            onClick={() => setSelectedCategoryId(undefined)}
            className={`shrink-0 select-none rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
              selectedCategoryId === undefined
                ? 'bg-sky-500 text-white ring-2 ring-sky-400'
                : 'bg-slate-850 text-slate-300'
            }`}
          >
            All Topics
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategoryId(category.id)}
              className={`shrink-0 select-none rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                selectedCategoryId === category.id
                  ? 'bg-sky-500 text-white ring-2 ring-sky-400'
                  : 'bg-slate-850 text-slate-300'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="flex gap-1 px-4 pb-2">
          {SORTS.map((sort) => (
            <button
              key={sort.id}
              type="button"
              onClick={() => setSortBy(sort.id)}
              className={`flex-1 select-none rounded-lg px-2 py-1.5 text-xs font-medium transition-colors duration-150 ${
                sortBy === sort.id
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 active:bg-slate-850'
              }`}
            >
              {sort.label}
            </button>
          ))}
        </div>
      </div>

      {topics.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Inbox size={40} className="text-slate-600" />
          <p className="text-sm text-slate-500">No discussions here yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-850">
          {topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} onSelectTopic={onSelectTopic} />
          ))}
        </div>
      )}
    </div>
  );
}
