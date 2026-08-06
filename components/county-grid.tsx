"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { KENYA_COUNTIES, statusLabel, type CountyStatus } from "@/lib/counties";
import { cn } from "@/lib/utils";

function statusVariant(status: CountyStatus): "default" | "secondary" | "warning" | "outline" {
  switch (status) {
    case "available":
      return "default";
    case "processing":
      return "warning";
    case "demo":
      return "secondary";
    default:
      return "outline";
  }
}

export function CountyGrid({ highlightDemo = false }: { highlightDemo?: boolean }) {
  const counties = highlightDemo
    ? KENYA_COUNTIES.filter((c) => c.status === "demo" || c.status === "processing")
    : KENYA_COUNTIES;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {counties.map((county) => {
        const clickable = county.status === "demo" || county.status === "available";
        const content = (
          <Card
            className={cn(
              "h-full transition-shadow",
              clickable ? "cursor-pointer hover:border-primary/40 hover:shadow-civic" : "opacity-90"
            )}
          >
            <CardContent className="flex items-start justify-between gap-2 p-4">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-semibold">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{county.name}</span>
                </p>
                {county.subCounties.length > 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {county.subCounties.length} sub-count{county.subCounties.length === 1 ? "y" : "ies"}
                  </p>
                ) : null}
              </div>
              <Badge variant={statusVariant(county.status)} className="shrink-0">
                {statusLabel(county.status)}
              </Badge>
            </CardContent>
          </Card>
        );

        if (clickable) {
          return (
            <Link key={county.slug} href={`/insights?county=${encodeURIComponent(county.name)}`}>
              {content}
            </Link>
          );
        }

        return <div key={county.slug}>{content}</div>;
      })}
    </div>
  );
}
