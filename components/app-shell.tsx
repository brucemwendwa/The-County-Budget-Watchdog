"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  FileText,
  Home,
  Landmark,
  Lightbulb,
  Menu,
  MessageSquareText,
  Settings,
  TrendingUp,
  X
} from "lucide-react";

import { LocationBreadcrumbs } from "@/components/location-breadcrumbs";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/ask-ai", label: "Ask AI", icon: MessageSquareText },
  { href: "/ideas", label: "Citizen Ideas", icon: Lightbulb },
  { href: "/insights", label: "Insights", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings }
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen">
      <Sidebar pathname={pathname} className="hidden lg:flex" />

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <Sidebar pathname={pathname} className="relative flex h-full w-64 shadow-xl" />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={mobileNavOpen}
            className="-ml-1 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <LocationBreadcrumbs className="min-w-0 flex-1" />
          <ThemeToggle />
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function Sidebar({ pathname, className }: { pathname: string; className?: string }) {
  return (
    <aside className={cn("w-64 shrink-0 flex-col border-r bg-card", className)}>
      <Link href="/" className="flex items-center gap-3 border-b px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Landmark className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold leading-tight">County Budget Tracker</span>
          <span className="block truncate text-xs text-muted-foreground">Track. Understand. Participate.</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="maasai-band mb-3 rounded-full" aria-hidden />
        <p className="text-xs leading-5 text-muted-foreground">
          Figures come from budget documents processed on this platform, each linked to the page it was read from.
        </p>
      </div>
    </aside>
  );
}
