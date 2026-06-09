import { cn } from "@/lib/utils";
import { STATUS_CLASSES, STATUS_DOT, STATUS_LABELS, type ObraStatus } from "@/lib/obra-utils";

export function StatusBadge({ status, className }: { status: ObraStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_CLASSES[status],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />
      {STATUS_LABELS[status]}
    </span>
  );
}
