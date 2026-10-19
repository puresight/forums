import Dexie, { type Table } from 'dexie';

export type SyncStatus = 'synced' | 'pending';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  role: 'admin' | 'moderator' | 'member';
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  color: string;
}

export interface Topic {
  id: string;
  categoryId: string;
  title: string;
  authorId: string;
  createdAt: number;
  updatedAt: number;
  lastPostAt: number;
  postCount: number;
  isPinned: boolean;
  isLocked: boolean;
  syncStatus: SyncStatus;
}

export interface Post {
  id: string;
  topicId: string;
  authorId: string;
  content: string;
  createdAt: number;
  syncStatus: SyncStatus;
}

export interface OutboxMutation {
  id?: number;
  entityType: 'topic' | 'post';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: string;
  createdAt: number;
}

export class ForumDatabase extends Dexie {
  users!: Table<User, string>;
  categories!: Table<Category, string>;
  topics!: Table<Topic, string>;
  posts!: Table<Post, string>;
  outbox!: Table<OutboxMutation, number>;

  constructor() {
    super('LocalForum');
    this.version(1).stores({
      users: 'id, username',
      categories: 'id, slug',
      topics: 'id, categoryId, authorId, createdAt, lastPostAt, syncStatus',
      posts: 'id, topicId, authorId, createdAt, syncStatus',
      outbox: '++id, entityType, entityId, createdAt',
    });
  }
}

export const db = new ForumDatabase();

export const CURRENT_USER_ID = 'user-me';

const seedUsers: User[] = [
  {
    id: CURRENT_USER_ID,
    username: 'you',
    displayName: 'You',
    avatarUrl: '',
    role: 'member',
  },
  {
    id: 'user-maya',
    username: 'maya.builds',
    displayName: 'Maya Chen',
    avatarUrl: '',
    role: 'moderator',
  },
  {
    id: 'user-devon',
    username: 'devon.k',
    displayName: 'Devon Park',
    avatarUrl: '',
    role: 'member',
  },
];

const seedCategories: Category[] = [
  {
    id: 'cat-general',
    slug: 'general',
    name: 'General',
    description: 'Everyday chatter that fits nowhere else.',
    color: '#38bdf8',
  },
  {
    id: 'cat-engineering',
    slug: 'engineering',
    name: 'Engineering',
    description: 'Deep dives, tooling talk, and hard-won lessons.',
    color: '#34d399',
  },
  {
    id: 'cat-showcase',
    slug: 'showcase',
    name: 'Showcase',
    description: 'Show off what you shipped this week.',
    color: '#fbbf24',
  },
];

interface SeedTopic {
  topic: Omit<Topic, 'postCount' | 'lastPostAt' | 'updatedAt'>;
  posts: Array<Omit<Post, 'topicId'>>;
}

const HOUR = 60 * 60 * 1000;
const base = Date.now() - 72 * HOUR;

const seedTopics: SeedTopic[] = [
  {
    topic: {
      id: 'topic-welcome',
      categoryId: 'cat-general',
      title: 'Welcome to LocalForum — start here',
      authorId: 'user-maya',
      createdAt: base,
      isPinned: true,
      isLocked: false,
      syncStatus: 'synced',
    },
    posts: [
      {
        id: 'post-w1',
        authorId: 'user-maya',
        content:
          'Welcome aboard! This forum works fully offline — everything you post is stored on your device and synced when you have a connection.',
        createdAt: base,
        syncStatus: 'synced',
      },
      {
        id: 'post-w2',
        authorId: 'user-devon',
        content:
          'Long-time lurker, first post. Excited to see an offline-first forum actually ship.',
        createdAt: base + 2 * HOUR,
        syncStatus: 'synced',
      },
      {
        id: 'post-w3',
        authorId: CURRENT_USER_ID,
        content: 'Just joined. The dark theme is really easy on the eyes at night.',
        createdAt: base + 4 * HOUR,
        syncStatus: 'synced',
      },
    ],
  },
  {
    topic: {
      id: 'topic-sync',
      categoryId: 'cat-engineering',
      title: 'How the offline outbox keeps writes safe',
      authorId: 'user-devon',
      createdAt: base + 24 * HOUR,
      isPinned: false,
      isLocked: false,
      syncStatus: 'synced',
    },
    posts: [
      {
        id: 'post-s1',
        authorId: 'user-devon',
        content:
          'Every write lands in a local outbox first. When connectivity returns, the queue drains in order.',
        createdAt: base + 24 * HOUR,
        syncStatus: 'synced',
      },
      {
        id: 'post-s2',
        authorId: 'user-maya',
        content:
          'Exactly — the UI never blocks on the network, which is what makes the app feel instant.',
        createdAt: base + 26 * HOUR,
        syncStatus: 'synced',
      },
    ],
  },
];

db.on('populate', () => {
  return db.transaction('rw', db.users, db.categories, db.topics, db.posts, async () => {
    await db.users.bulkPut(seedUsers);
    await db.categories.bulkPut(seedCategories);

    for (const { topic, posts } of seedTopics) {
      const lastPostAt = Math.max(...posts.map((p) => p.createdAt));
      await db.topics.add({
        ...topic,
        postCount: posts.length,
        lastPostAt,
        updatedAt: lastPostAt,
      });
      await db.posts.bulkPut(posts.map((p) => ({ ...p, topicId: topic.id })));
    }
  });
});
