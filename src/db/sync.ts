import { db } from './index';
import { log, timeOperation } from '@/lib/observability/logger';

export interface SyncResult {
  success: boolean;
  processedCount: number;
  error?: string;
}

export interface SyncEngine {
  isSyncing: boolean;
  lastSyncAt: number | null;
  sync: () => Promise<SyncResult>;
}

let slowNetwork = false;

export function setSlowNetwork(enabled: boolean): void {
  slowNetwork = enabled;
}

export function isSlowNetwork(): boolean {
  return slowNetwork;
}

export const syncEngine: SyncEngine = {
  isSyncing: false,
  lastSyncAt: null,
  async sync() {
    const pendingMutations = await db.outbox.toArray();
    if (pendingMutations.length === 0) {
      return { success: true, processedCount: 0 };
    }

    this.isSyncing = true;
    log('info', 'sync', `Sync started (${pendingMutations.length} pending)`);
    const startedAt = performance.now();
    try {
      // Simulated network latency; replace with the real transport when the
      // Cloudflare sync target is wired up.
      const baseDelay = slowNetwork ? 3000 : 500;
      await new Promise((resolve) => setTimeout(resolve, baseDelay));

      await timeOperation('sync', 'sync transaction', () =>
        db.transaction('rw', [db.topics, db.posts, db.outbox], async () => {
          await db.topics.where('syncStatus').equals('pending').modify({ syncStatus: 'synced' });
          await db.posts.where('syncStatus').equals('pending').modify({ syncStatus: 'synced' });
          await db.outbox.clear();
        })
      );

      this.lastSyncAt = Date.now();
      log('info', 'sync', 'Sync completed', {
        durationMs: Math.round(performance.now() - startedAt),
        context: { processed: pendingMutations.length },
      });
      return { success: true, processedCount: pendingMutations.length };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown sync error';
      log('error', 'sync', 'Sync failed', {
        durationMs: Math.round(performance.now() - startedAt),
        context: { error: message },
      });
      return { success: false, processedCount: 0, error: message };
    } finally {
      this.isSyncing = false;
    }
  },
};

export async function exportLocalBackup(): Promise<void> {
  const [users, categories, topics, posts, outbox] = await Promise.all([
    db.users.toArray(),
    db.categories.toArray(),
    db.topics.toArray(),
    db.posts.toArray(),
    db.outbox.toArray(),
  ]);
  const backup = { exportedAt: new Date().toISOString(), users, categories, topics, posts, outbox };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `localforum-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function resetToSeedData(): Promise<void> {
  await Promise.all([
    db.users.clear(),
    db.categories.clear(),
    db.topics.clear(),
    db.posts.clear(),
    db.outbox.clear(),
  ]);
  localStorage.clear();
}
