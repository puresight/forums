export type LogLevel = 'info' | 'warn' | 'error';
export type LogCategory = 'db' | 'sync' | 'storage' | 'network';

export interface LogEntry {
  id: number;
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  durationMs?: number;
  context?: Record<string, unknown>;
}

type Listener = (entries: readonly LogEntry[]) => void;

const MAX_ENTRIES = 100;
const MAX_CONTEXT_SERIALIZATION = 500;

let buffer: LogEntry[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

export function getLogSnapshot(): readonly LogEntry[] {
  return buffer;
}

export function subscribeToLogs(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  const snapshot = buffer;
  for (const listener of listeners) listener(snapshot);
}

export function log(
  level: LogLevel,
  category: LogCategory,
  message: string,
  options?: { durationMs?: number; context?: Record<string, unknown> }
): void {
  let context = options?.context;
  if (context) {
    try {
      const serialized = JSON.stringify(context);
      if (serialized.length > MAX_CONTEXT_SERIALIZATION) {
        context = { truncated: serialized.slice(0, MAX_CONTEXT_SERIALIZATION) + '…' };
      }
    } catch {
      context = { note: 'unserializable context' };
    }
  }

  buffer = [...buffer.slice(-(MAX_ENTRIES - 1)), { id: newId(), timestamp: Date.now(), level, category, message, ...options }];
  notify();
}

function newId() {
  return nextId++;
}

export function timeOperation<T>(
  category: LogCategory,
  message: string,
  op: () => Promise<T>,
  levelForError: LogLevel = 'error'
): Promise<T> {
  const start = performance.now();
  return op().then(
    (result) => {
      log('info', category, message, { durationMs: Math.round((performance.now() - start) * 100) / 100 });
      return result;
    },
    (err: unknown) => {
      log(levelForError, category, message, {
        durationMs: Math.round((performance.now() - start) * 100) / 100,
        context: { error: err instanceof Error ? err.message : String(err) },
      });
      throw err;
    }
  );
}
