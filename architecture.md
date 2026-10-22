# Local-First Forum Architecture

## 0. Status

### Done (Bolt.new Fast-Prototype Phase)

- **Local-First Database Schema:** Strongly typed Dexie.js (`IndexedDB`) models defining `categories`, `topics`, `posts`, and `outbox` mutation records.
- **Deterministic Seeding:** Mock identity (`user-me`), seed categories with distinct accent tags, and populated initial topics/posts with `synced` status.
- **Reactive UI Reads:** Real-time data synchronization using `dexie-react-hooks` (`useLiveQuery`) across all feeds and thread streams.
- **Mobile-First Touch Ergonomics:** Fixed sticky top header, bottom navigation bar with active route highlighting, touch targets conforming to $\ge 44\text{px}$, and safe-area inset preservation (`env(safe-area-inset-*)`).
- **Desktop Responsive Adaptation:** Fluid expansion across `md:` ($\ge 768\text{px}$) and `lg:` ($\ge 1024\text{px}$) breakpoints featuring a persistent left navigation sidebar, multi-column feed rows, capped thread line length (`max-w-3xl`), and an active context rail.
- **Optimistic Local Mutations:** Transactional topic and post creation executing across `topics`/`posts` and `outbox` simultaneously with zero network-dependent latency.
- **Resilient Draft Persistence:** Non-blocking auto-save for uncommitted post and topic drafts backed by local browser storage.
- **In-App Observability & Diagnostics (Turn 5.5):** In-memory circular log ring buffer capturing transaction durations, Dexie schema metadata, storage quota telemetry (`navigator.storage.estimate`), and a slide-over/slide-up diagnostics console.
- **Sync Engine Contract:** Abstract `SyncEngine` interface in `src/db/sync.ts` decoupling local mutation queues from remote network transport.

### TODO (Antigravity & Cloudflare Implementation Phase)

- **Cloudflare Worker Backend:** Hono API scaffold running at the Edge to terminate authentication and process synchronization payloads.
- **D1 Relational Storage:** Cloudflare D1 SQLite database mirror matching Dexie domain schema with proper migration files.
- **Delta Synchronization Protocol:** Two-way batch synchronization endpoint (`POST /api/sync`) accepting local `outbox` mutations and returning remote log deltas based on client `lastSyncTimestamp`.
- **Conflict Resolution Strategy:** Client- or server-authoritative Last-Write-Wins (LWW) or field-level conflict reconciliation for edited posts and metadata.
- **Authentication & Identity:** Production WebAuthn/Passkey or session token issuance via Worker KV/cookies replacing local identity mocking.
- **Service Worker Caching:** Explicit offline asset shell caching and Web Background Sync registration via `vite-plugin-pwa` (deferred intentionally from prototype turns).
- **Live Broadcast Channel:** Durable Objects or Server-Sent Events (SSE) integration for multi-client real-time post broadcasts.

---

## 1. System Overview & Core Philosophy

The forum runs as a **local-first, offline-capable Progressive Web App**. The source of truth for the user interface is always the local browser database (IndexedDB via Dexie.js), never an active network round-trip.

The system is bifurcated into two independent planes:

1. **The Client Plane (UI & Local Persistence):** Driven by React, Tailwind CSS, and Dexie.js. Reads are reactive; writes are instantaneous, appending state changes to a local outbox.
2. **The Cloud Plane (Edge & Relational Mirror):** Hosted on Cloudflare Workers and Cloudflare D1. Acts as an asynchronous coordination and broadcast authority rather than a synchronous blocker for interface actions.

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Plane                         │
│                                                             │
│  React Components (FeedView, ThreadView, ComposerModal)     │
│        ▲                                       │            │
│  useLiveQuery()                         write() / mutate()  │
│        │                                       ▼            │
│  ┌───────────────┐                       ┌───────────────┐  │
│  │ Dexie Tables  │ ◄───[Local Transact]─┤ Outbox Queue  │  │
│  │ (topics/posts)│                       │ (mutations)   │  │
│  └───────▲───────┘                       └───────┬───────┘  │
└──────────┼───────────────────────────────────────┼──────────┘
           │                                       │
     (apply deltas)                         (flush outbox)
           │                                       │
┌──────────┴───────────────────────────────────────▼──────────┐
│                         Cloud Plane                         │
│                                                             │
│         Cloudflare Worker (Hono REST / Sync Engine)         │
│                              │                              │
│                     Cloudflare D1 (SQLite)                  │
└─────────────────────────────────────────────────────────────┘

```

---

## 2. Client Data Layer (Dexie.js)

The client data layer enforces local transactional integrity using indexed stores defined in `src/db/index.ts`.

### Stores & Indexing

- **`categories`** (`id, slug`): Static and synchronized discussion sections.
- **`topics`** (`id, categoryId, authorId, createdAt, lastPostAt, syncStatus`): Discussion headers. Track reply counts, moderation flags (`isPinned`, `isLocked`), and sync states (`synced` vs `pending`).
- **`posts`** (`id, topicId, authorId, createdAt, syncStatus`): Markdown message blocks linked to parent topics.
- **`outbox`** (`++id, entityType, entityId, createdAt`): Append-only mutation queue storing pending sync actions (`operation: 'create' | 'update' | 'delete'`, serialized payload, timestamp).

### Reactivity & Mutation Flow

- **Live Reads:** UI views never execute single-shot fetch queries. Components subscribe to `useLiveQuery(...)`, causing components to auto-render whenever an IndexedDB transaction commits.
- **Atomic Writes:** Mutations (e.g., creating a reply) use Dexie multi-table transactions:

1. Write the new `Post` record with `syncStatus: 'pending'`.
2. Update parent `Topic` (`postCount += 1`, `lastPostAt = now`).
3. Append an `OutboxMutation` record.
   Because writes resolve locally in single-digit milliseconds, user interfaces update instantly without artificial spinners.

---

## 3. UI/UX & Responsive Layout Architecture

The user interface uses Tailwind CSS breakpoints to scale between touch-focused mobile devices and large workstation displays while preserving a shared state tree.

### Responsive Breakpoint Strategy

- **Mobile (< 768px):**
- Top navigation bar with persistent status indicators (Online/Offline, storage warning, active user).
- Main single-column feed with momentum touch scrolling.
- Bottom navigation dock with safe-area bottom padding (`env(safe-area-inset-bottom)`).
- Full-screen slide-over modal for content creation (`ComposerModal`).

- **Tablet & Desktop ($\ge$ 768px):**
- Multi-column grid container capped at `max-w-6xl`.
- Persistent 240px left sidebar navigation replacing the bottom bar.
- Desktop-grade topic table view showing categorized meta columns, timestamps, and last-author indicators.
- Centered dialog composer with side-by-side split Markdown editor and live preview.
- Optional sticky right context rail ($\ge 1024\text{px}$) rendering topic metadata and diagnostics.

---

## 4. Observability & Diagnostics Subsystem

Operating without a service worker requires client-level instrumentation to track IndexedDB health and storage resource pressure.

- **Storage Metric Harvester:** Interrogates `navigator.storage.estimate()` to calculate active IndexedDB usage against browser-allotted quotas. Identifies whether persistence is categorized as `persisted` or `best-effort`.
- **Structured Diagnostic Ring Buffer:** Intercepts database writes and sync transitions via high-resolution performance timers (`performance.now()`). Maintains the last 100 entries in an in-memory subscription ring buffer:
- Log levels: `info`, `warn`, `error`.
- Diagnostic domains: `db`, `sync`, `storage`, `network`.

- **Diagnostics Console:** An interactive slide-up/slide-over drawer surfacing average transaction latencies, storage pressure meters, raw outbox JSON inspection, and a network simulation switch to test optimistic behavior under high latency.

---

## 5. Synchronization Boundary (The Hand-off Contract)

The application enforces strict separation between local data operations and network transport via `src/db/sync.ts`.

### Outbox Processing Pattern

The client uses an outbox queue to handle offline operation:

1. When offline or online, writes append to `outbox`.
2. When connectivity is detected (`navigator.onLine` or network state recovery), `syncEngine.sync()` executes.
3. The sync client iterates pending `outbox` records, transmits the payload batched to the Edge worker, and awaits commit confirmation.
4. On success, `syncStatus` flags in local tables flip to `synced`, and the corresponding `outbox` records are cleared within an atomic Dexie transaction.

### Antigravity Hand-Off Scope

The Cloudflare Worker implementation in Antigravity implements:

- `POST /api/sync`: Receives `{ clientLastSyncAt, mutations: OutboxMutation[] }`.
- Executes incoming mutations within a Cloudflare D1 batch transaction.
- Returns `{ serverTimestamp, appliedCount, updates: { topics: Topic[], posts: Post[] } }` containing changes committed by other clients since `clientLastSyncAt`.
- Updates the local Dexie stores using incoming deltas, triggering automatic UI updates across all active subscribers.
