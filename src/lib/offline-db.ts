// IndexedDB persistence for the offline-first layer.
// Stores a queue of pending mutations and a local action log so nothing is
// lost when the user works without a connection.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type QueueStatus = "pending" | "syncing" | "error";

export type SupabaseOp = "insert" | "update" | "delete" | "upsert";

export interface QueuedMutation {
  id: string;
  table: string;
  op: SupabaseOp;
  /** Row(s) to write for insert/update/upsert. */
  payload?: Record<string, unknown>;
  /** Equality filters (column -> value) for update/delete. */
  match?: Record<string, unknown>;
  /** Used for last-write-wins conflict resolution. */
  updatedAt: string;
  label: string;
  status: QueueStatus;
  attempts: number;
  lastError?: string;
  createdAt: number;
}

export interface OfflineLog {
  id: string;
  at: number;
  kind: "enqueue" | "sync-ok" | "sync-fail" | "retry";
  message: string;
}

interface FiscDB extends DBSchema {
  queue: {
    key: string;
    value: QueuedMutation;
    indexes: { byCreatedAt: number };
  };
  logs: {
    key: string;
    value: OfflineLog;
    indexes: { byAt: number };
  };
}

let dbPromise: Promise<IDBPDatabase<FiscDB>> | null = null;

function getDB() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB indisponível"));
  }
  if (!dbPromise) {
    dbPromise = openDB<FiscDB>("fiscrecife-offline", 1, {
      upgrade(db) {
        const queue = db.createObjectStore("queue", { keyPath: "id" });
        queue.createIndex("byCreatedAt", "createdAt");
        const logs = db.createObjectStore("logs", { keyPath: "id" });
        logs.createIndex("byAt", "at");
      },
    });
  }
  return dbPromise;
}

export async function putMutation(m: QueuedMutation): Promise<void> {
  const db = await getDB();
  await db.put("queue", m);
}

export async function deleteMutation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("queue", id);
}

export async function getAllMutations(): Promise<QueuedMutation[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("queue", "byCreatedAt");
  return all;
}

export async function countMutations(): Promise<number> {
  const db = await getDB();
  return db.count("queue");
}

export async function addLog(log: Omit<OfflineLog, "id" | "at">): Promise<void> {
  const db = await getDB();
  await db.put("logs", { ...log, id: crypto.randomUUID(), at: Date.now() });
  // keep only the latest ~200 entries
  const keys = await db.getAllKeysFromIndex("logs", "byAt");
  if (keys.length > 200) {
    const toDelete = keys.slice(0, keys.length - 200);
    await Promise.all(toDelete.map((k) => db.delete("logs", k)));
  }
}

export async function getRecentLogs(limit = 50): Promise<OfflineLog[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("logs", "byAt");
  return all.reverse().slice(0, limit);
}

export async function clearLogs(): Promise<void> {
  const db = await getDB();
  await db.clear("logs");
}
