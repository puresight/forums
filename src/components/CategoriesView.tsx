import { useLiveQuery } from 'dexie-react-hooks';
import { Hash } from 'lucide-react';
import { db } from '@/db';
import { formatRelativeTime } from '@/lib/time';

export default function CategoriesView({
  onSelectCategory,
}: {
  onSelectCategory: (categoryId: string) => void;
}) {
  const categories = useLiveQuery(
    () => db.categories.orderBy('name').toArray(),
    [],
    []
  );
  const counts = useLiveQuery(async () => {
    const topics = await db.topics.toArray();
    const map = new Map<string, number>();
    for (const t of topics) {
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + 1);
    }
    return map;
  }, []);

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+4.5rem)]">
      <div className="space-y-3">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelectCategory(category.id)}
            className="block w-full select-none rounded-2xl bg-slate-900/60 p-4 text-left ring-1 ring-white/5 transition-colors duration-150 active:bg-slate-850"
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${category.color}1a`, color: category.color }}
              >
                <Hash size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-slate-100">
                    {category.name}
                  </h3>
                  <span className="shrink-0 text-xs text-slate-500">
                    {counts?.get(category.id) ?? 0}{' '}
                    {(counts?.get(category.id) ?? 0) === 1 ? 'topic' : 'topics'}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
                  {category.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
      <p className="mt-4 text-center text-[11px] text-slate-600">
        Updated {formatRelativeTime(Date.now())}
      </p>
      <div className="h-2" />
    </div>
  );
}
