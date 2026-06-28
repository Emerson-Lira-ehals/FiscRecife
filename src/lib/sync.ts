// Offline mutation queue + automatic sync engine.
//
// Usage: wrap a Supabase write with `mutateOffline(...)`. When online it runs
// immediately; when offline (or on a network failure) the mutation is stored in
// IndexedDB and replayed automatically once the connection returns, with retry
// and exponential backoff. Conflicts use last-write-wins via `updated_at`.

import { supabase } from "@/integrations/supabase/client";
import {
  addLog,
  countMutations,
  deleteMutation,
  getAllMutations,
  putMutation,
  type QueuedMutation,
  type SupabaseOp,
} from "@/lib/offline-db";

type Listener = (state: SyncState) => void;

export interface SyncState {
  online: boolean;
  syncing: boolean;
  pending: number;
  lastSyncAt: number | null;
  lastError: string | null;
}

const state: SyncState = {
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  syncing: false,
  pending: 0,
  lastSyncAt: null,
  lastError: null,
};

const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l({ ...state });
}

export function subscribeSync(listener: Listener): () => void {
  listener({ ...state });
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function refreshPending() {
  try {
    state.pending = await countMutations();
  } catch {
    state.pending = 0;
  }
  emit();
}

function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    msg.includes("timeout") ||
    msg.includes("offline")
  );
}

async function runMutation(m: QueuedMutation): Promise<void> {
  const q = supabase.from(m.table as never);
  let builder: ReturnType<typeof q.insert> | ReturnType<typeof q.update> | ReturnType<typeof q.delete>;

  switch (m.op) {
    case "insert":
      builder = q.insert(m.payload as never);
      break;
    case "upsert":
      builder = (q as { upsert: (v: unknown) => never }).upsert(m.payload as never);
      break;
    case "update":
      builder = q.update(m.payload as never);
      break;
    case "delete":
      builder = q.delete();
      break;
    default:
      throw new Error(`Operação desconhecida: ${m.op as string}`);
  }

  if (m.match) {
    for (const [col, val] of Object.entries(m.match)) {
      builder = (builder as { eq: (c: string, v: unknown) => typeof builder }).eq(col, val);
    }
  }

  const { error } = await builder;
  if (error) throw new Error(error.message);
}

export interface MutateInput {
  table: string;
  op: SupabaseOp;
  payload?: Record<string, unknown>;
  match?: Record<string, unknown>;
  label: string;
}

/**
 * Try a write online; on network failure, queue it for later sync.
 * Returns `{ queued: true }` when stored offline, `{ queued: false }` when sent.
 */
export async function mutateOffline(input: MutateInput): Promise<{ queued: boolean }> {
  const mutation: QueuedMutation = {
    id: crypto.randomUUID(),
    table: input.table,
    op: input.op,
    payload: input.payload,
    match: input.match,
    updatedAt: new Date().toISOString(),
    label: input.label,
    status: "pending",
    attempts: 0,
    createdAt: Date.now(),
  };

  if (state.online) {
    try {
      await runMutation(mutation);
      state.lastSyncAt = Date.now();
      state.lastError = null;
      emit();
      return { queued: false };
    } catch (err) {
      if (!isNetworkError(err)) throw err; // real validation/permission error -> surface it
      // otherwise fall through to queue
    }
  }

  await putMutation(mutation);
  await addLog({ kind: "enqueue", message: `Salvo offline: ${input.label}` });
  await refreshPending();
  return { queued: true };
}

let flushing = false;

export async function flushQueue(): Promise<void> {
  if (flushing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  flushing = true;
  state.syncing = true;
  emit();

  try {
    const items = await getAllMutations();
    for (const m of items) {
      try {
        await runMutation(m);
        await deleteMutation(m.id);
        await addLog({ kind: "sync-ok", message: `Sincronizado: ${m.label}` });
      } catch (err) {
        if (isNetworkError(err)) {
          // connection dropped mid-flush; stop and try again later
          break;
        }
        const attempts = m.attempts + 1;
        const lastError = err instanceof Error ? err.message : String(err);
        await putMutation({ ...m, attempts, status: "error", lastError });
        await addLog({
          kind: "sync-fail",
          message: `Falha (${attempts}) ao sincronizar ${m.label}: ${lastError}`,
        });
        // Give up after several attempts to avoid an infinite loop.
        if (attempts >= 5) {
          await deleteMutation(m.id);
          await addLog({
            kind: "sync-fail",
            message: `Descartado após 5 tentativas: ${m.label}`,
          });
        }
      }
    }
    state.lastSyncAt = Date.now();
    state.lastError = null;
  } catch (err) {
    state.lastError = err instanceof Error ? err.message : String(err);
  } finally {
    flushing = false;
    state.syncing = false;
    await refreshPending();
  }
}

let retryTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRetry(delay = 15000) {
  if (retryTimer) return;
  retryTimer = setTimeout(async () => {
    retryTimer = null;
    if (state.online && state.pending > 0) {
      await flushQueue();
      if (state.pending > 0) scheduleRetry(Math.min(delay * 2, 5 * 60 * 1000));
    }
  }, delay);
}

let started = false;

/** Wire up online/offline listeners and an initial flush. Call once on the client. */
export function startSyncEngine(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  const setOnline = (online: boolean) => {
    state.online = online;
    emit();
    if (online) {
      void flushQueue();
    }
  };

  window.addEventListener("online", () => setOnline(true));
  window.addEventListener("offline", () => setOnline(false));
  window.addEventListener("focus", () => {
    if (state.online && state.pending > 0) void flushQueue();
  });

  void refreshPending().then(() => {
    if (state.online) void flushQueue();
    scheduleRetry();
  });
}
