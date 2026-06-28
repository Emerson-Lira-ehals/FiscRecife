import { useEffect, useState } from "react";
import { subscribeSync, type SyncState } from "@/lib/sync";

const INITIAL: SyncState = {
  online: true,
  syncing: false,
  pending: 0,
  lastSyncAt: null,
  lastError: null,
};

/** Reactive connection + synchronization state for the offline-first layer. */
export function useSyncStatus(): SyncState {
  const [state, setState] = useState<SyncState>(INITIAL);
  useEffect(() => subscribeSync(setState), []);
  return state;
}
