import { db, type Post, type Topic } from './index';
import { timeOperation } from '@/lib/observability/logger';

export interface CreateTopicInput {
  categoryId: string;
  title: string;
  content: string;
  authorId: string;
}

export interface CreateReplyInput {
  topicId: string;
  content: string;
  authorId: string;
}

export async function createTopic(data: CreateTopicInput): Promise<string> {
  return timeOperation('db', 'createTopic', async () => {
    const now = Date.now();
    const topicId = crypto.randomUUID();
    const topic: Topic = {
      id: topicId,
      categoryId: data.categoryId,
      title: data.title,
      authorId: data.authorId,
      createdAt: now,
      updatedAt: now,
      lastPostAt: now,
      postCount: 1,
      isPinned: false,
      isLocked: false,
      syncStatus: 'pending',
    };
    const post: Post = {
      id: crypto.randomUUID(),
      topicId,
      authorId: data.authorId,
      content: data.content,
      createdAt: now,
      syncStatus: 'pending',
    };

    await db.transaction('rw', db.topics, db.posts, db.outbox, async () => {
      await db.topics.add(topic);
      await db.posts.add(post);
      await db.outbox.add({
        entityType: 'topic',
        entityId: topicId,
        operation: 'create',
        payload: JSON.stringify({ topic, post }),
        createdAt: now,
      });
    });

    return topicId;
  });
}

export async function createReply(data: CreateReplyInput): Promise<string> {
  return timeOperation('db', 'createReply', async () => {
    const now = Date.now();
    const postId = crypto.randomUUID();
    const post: Post = {
      id: postId,
      topicId: data.topicId,
      authorId: data.authorId,
      content: data.content,
      createdAt: now,
      syncStatus: 'pending',
    };

    await db.transaction('rw', db.topics, db.posts, db.outbox, async () => {
      await db.posts.add(post);
      const topic = await db.topics.get(data.topicId);
      if (topic) {
        await db.topics.update(data.topicId, {
          postCount: topic.postCount + 1,
          lastPostAt: now,
        });
      }
      await db.outbox.add({
        entityType: 'post',
        entityId: postId,
        operation: 'create',
        payload: JSON.stringify(post),
        createdAt: now,
      });
    });

    return postId;
  });
}
