import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Category, type Post, type Topic, type User } from './index';

export type TopicSort = 'latest' | 'top' | 'unanswered';

export interface TopicWithMeta extends Topic {
  author?: User;
  category?: Category;
}

export function useCategories(): Category[] {
  return (
    useLiveQuery(async () => {
      const categories = await db.categories.toArray();
      return categories.sort((a, b) => a.name.localeCompare(b.name));
    }, []) ?? []
  );
}

export function useTopics(
  categoryId?: string,
  sortBy: TopicSort = 'latest'
): TopicWithMeta[] {
  return (
    useLiveQuery(async () => {
      let topics = await db.topics.toArray();
      if (categoryId) topics = topics.filter((t) => t.categoryId === categoryId);

      if (sortBy === 'latest') {
        topics.sort((a, b) => b.lastPostAt - a.lastPostAt);
      } else if (sortBy === 'top') {
        topics.sort((a, b) => b.postCount - a.postCount);
      } else {
        topics = topics
          .filter((t) => t.postCount === 1)
          .sort((a, b) => a.lastPostAt - b.lastPostAt);
      }

      const [users, categories] = await Promise.all([
        db.users.toArray(),
        db.categories.toArray(),
      ]);
      const userMap = new Map(users.map((u) => [u.id, u]));
      const categoryMap = new Map(categories.map((c) => [c.id, c]));

      return topics.map((topic) => ({
        ...topic,
        author: userMap.get(topic.authorId),
        category: categoryMap.get(topic.categoryId),
      }));
    }, [categoryId, sortBy]) ?? []
  );
}

export interface ThreadData {
  topic?: Topic;
  category?: Category;
  author?: User;
  posts: Array<Post & { author?: User }>;
  isLoading: boolean;
}

export function useThread(topicId: string): ThreadData {
  const thread = useLiveQuery(
    async () => {
      const topic = await db.topics.get(topicId);
      if (!topic) return undefined;

      const [posts, users, categories] = await Promise.all([
        db.posts.where('topicId').equals(topicId).toArray(),
        db.users.toArray(),
        db.categories.toArray(),
      ]);
      posts.sort((a, b) => a.createdAt - b.createdAt);

      const userMap = new Map(users.map((u) => [u.id, u]));
      const category = categories.find((c) => c.id === topic.categoryId);

      return {
        topic,
        category,
        author: userMap.get(topic.authorId),
        posts: posts.map((p) => ({ ...p, author: userMap.get(p.authorId) })),
      };
    },
    [topicId]
  );

  if (!thread) return { posts: [], isLoading: true };
  return { ...thread, isLoading: false };
}
