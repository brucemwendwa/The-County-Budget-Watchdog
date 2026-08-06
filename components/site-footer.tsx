import Link from "next/link";

import { MaasaiDivider } from "@/components/maasai-divider";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-card">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <MaasaiDivider className="mb-8" />
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-lg font-bold">County Budget Tracker</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              AI-powered civic finance platform helping citizens understand official county budget documents from county
              level down to ward level.
            </p>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Explore</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link className="text-foreground hover:text-primary" href="/insights">
                  County insights
                </Link>
              </li>
              <li>
                <Link className="text-foreground hover:text-primary" href="/documents">
                  Source documents
                </Link>
              </li>
              <li>
                <Link className="text-foreground hover:text-primary" href="/ask-ai">
                  Ask AI
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Responsible use</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              AI summarizes official public documents. Verify important findings from source documents. Items needing
              clarification are informational, not accusations.
            </p>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Built for transparency, public participation, and civic understanding in Kenya.
        </p>
      </div>
    </footer>
  );
}
