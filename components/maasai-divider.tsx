export function MaasaiDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`} aria-hidden>
      <span className="h-px flex-1 bg-border" />
      <span className="flex gap-1">
        <span className="h-2 w-2 rotate-45 bg-primary/70" />
        <span className="h-2 w-2 rotate-45 bg-amber-500/60" />
        <span className="h-2 w-2 rotate-45 bg-primary/70" />
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
