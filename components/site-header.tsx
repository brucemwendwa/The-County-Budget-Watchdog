"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/" as const, label: "Home" },
  { href: "/insights" as const, label: "Counties" },
  { href: "/documents" as const, label: "Documents" },
  { href: "/ask-ai" as const, label: "Ask AI" },
  { href: "/insights" as const, label: "Insights", hash: "sectors" },
  { href: "/upload" as const, label: "Upload PDF" }
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <FileText className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-tight sm:text-base">County Budget Tracker</span>
              <span className="hidden text-xs text-muted-foreground sm:block">Track. Understand. Participate.</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto pb-1 text-sm font-semibold [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href && !item.hash;
            const className = cn(
              "shrink-0 rounded-md px-3 py-2 transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            );
            if (item.hash) {
              return (
                <a key={`${item.href}-${item.label}`} href={`${item.href}#${item.hash}`} className={className}>
                  {item.label}
                </a>
              );
            }
            return (
              <Link key={`${item.href}-${item.label}`} href={item.href} className={className}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
