import { CloudOff, RefreshCw, CheckCircle2, CloudUpload } from "lucide-react";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { flushQueue } from "@/lib/sync";
import { cn } from "@/lib/utils";

/** Compact connection + sync chip shown in the header. */
export function SyncStatusChip({ className }: { className?: string }) {
  const { online, syncing, pending } = useSyncStatus();

  let icon = <CheckCircle2 className="h-3.5 w-3.5" />;
  let label = "Sincronizado";
  let tone = "bg-success/10 text-success";

  if (!online) {
    icon = <CloudOff className="h-3.5 w-3.5" />;
    label = pending > 0 ? `Offline · ${pending} pendente${pending > 1 ? "s" : ""}` : "Offline";
    tone = "bg-warning/15 text-warning-foreground";
  } else if (syncing) {
    icon = <RefreshCw className="h-3.5 w-3.5 animate-spin" />;
    label = "Sincronizando…";
    tone = "bg-primary/10 text-primary";
  } else if (pending > 0) {
    icon = <CloudUpload className="h-3.5 w-3.5" />;
    label = `${pending} pendente${pending > 1 ? "s" : ""}`;
    tone = "bg-warning/15 text-warning-foreground";
  }

  return (
    <button
      type="button"
      onClick={() => online && pending > 0 && void flushQueue()}
      title={
        !online
          ? "Sem conexão — suas ações serão enviadas automaticamente quando a internet voltar"
          : pending > 0
            ? "Toque para sincronizar agora"
            : "Tudo sincronizado"
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition",
        tone,
        online && pending > 0 ? "cursor-pointer hover:opacity-80" : "cursor-default",
        className,
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/** Full-width banner shown when the device is offline. */
export function OfflineBanner() {
  const { online, pending } = useSyncStatus();
  if (online) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-warning px-4 py-1.5 text-center text-xs font-semibold text-warning-foreground">
      <CloudOff className="h-3.5 w-3.5 shrink-0" />
      <span>
        Você está offline. Suas ações são salvas no aparelho
        {pending > 0 ? ` (${pending} pendente${pending > 1 ? "s" : ""})` : ""} e enviadas
        automaticamente quando a conexão voltar.
      </span>
    </div>
  );
}
