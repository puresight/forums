import { useEffect, useState } from 'react';
import { MessageSquare, Inbox, ListFilter } from 'lucide-react';
import { useCategories, useTopics, type TopicSort } from '@/db/queries';
import TopicCard from './TopicCard';

const SORTS: Array<{ id: TopicSort; label: string }> = [
  { id: 'latest', label: 'Latest' },
  { id: 'top', label: 'Top' },
  { id: 'unanswered', label: 'Unanswered' },
];

export default function FeedView({
  onSelectTopic,
  initialCategoryId,
}: {
  onSelectTopic: (topicId: string) => void;
  initialCategoryId?: string;
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(
    initialCategoryId
  );
  const [sortBy, setSortBy] = useState<TopicSort>('latest');

  const categories = useCategories();
  const topics = useTopics(selectedCategoryId, sortBy);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setSelectedCategoryId(detail);
    };
    window.addEventListener('select-feed-category', handler);
    return () => window.removeEventListener('select-feed-category', handler);
  }, []);

  const activeCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-14 z-10 border-b border-slate-800 bg-slate-950/90 pt-[env(safe-area-inset-top)] backdrop-blur-sm md:static md:rounded-2xl md:border md:border-slate-800 md:bg-slate-900/40 md:pt-0">
        {/* Mobile chip row / desktop filter group */}
        <div
          className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2 md:px-4 md:py-3"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <button
            type="button"
            onClick={() => setSelectedCategoryId(undefined)}
            className={`shrink-0 select-none rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150 md:rounded-lg md:px-4 md:py-2 md:text-sm ${
              selectedCategoryId === undefined
                ? 'bg-sky-500 text-white ring-2 ring-sky-400 md:ring-0'
                : 'bg-slate-850 text-slate-300 hover:bg-slate-800 md:hover:bg-slate-800'
            }`}
          >
            All Topics
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategoryId(category.id)}
              className={`shrink-0 select-none rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150 md:rounded-lg md:px-4 md:py-2 md:text-sm ${
                selectedCategoryId === category.id
                  ? 'bg-sky-500 text-white ring-2 ring-sky-400 md:ring-0'
                  : 'bg-slate-850 text-slate-300 hover:bg-slate-800 md:hover:bg-slate-800'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="flex gap-1 px-4 pb-2 md:items-center md:gap-2 md:px-4 md:pb-3">
          <span className="hidden items-center gap-1.5 text-xs text-slate-500 md:flex">
            <ListFilter size={14} />
            Sort
          </span>
          {SORTS.map((sort) => (
            <button
              key={sort.id}
              type="button"
              onClick={() => setSortBy(sort.id)}
              className={`flex-1 select-none rounded-lg px-2 py-1.5 text-xs font-medium transition-colors duration-150 md:flex-none md:px-3 ${
                sortBy === sort.id
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:bg-slate-850 md:hover:bg-slate-800 active:bg-slate-850'
              }`}
            >
              {sort.label}
            </button>
          ))}
          {activeCategory && (
            <span className="ml-auto hidden text-xs text-slate-500 md:block">
              Filtering: {activeCategory.name}
            </span>
          )}
        </div>
      </div>

      {topics.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Inbox size={40} className="text-slate-600" />
          <p className="text-sm text-slate-500">No discussions here yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-850 md:mt-4 md:divide-y-0 md:space-y-2">
          {topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} onSelectTopic={onSelectTopic} />
          ))}
        </div>
      )}
    </div>
  );
}
