import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Used wherever there is nothing to show. It always names what is missing and what would fill it,
 * because an empty panel is the honest answer when no document has been processed — the
 * alternative would be inventing figures.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}: {
  icon?: ElementType;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 px-6 py-10 text-center",
        className
      )}
    >
      {Icon ? <Icon className="mb-3 h-7 w-7 text-muted-foreground" aria-hidden /> : null}
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
