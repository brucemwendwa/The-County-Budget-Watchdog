"use client";

import { Moon, RotateCcw, Sun } from "lucide-react";

import { useLocationState } from "@/components/location-provider";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KENYA_DATA_SOURCE, countWards, locationLabel } from "@/lib/kenya";

export function SettingsView({ platform }: { platform: { modelConfigured: boolean; ocrConfigured: boolean; durableStorage: boolean } }) {
  const { theme, setTheme } = useTheme();
  const { hierarchy, location, reset } = useLocationState();

  const wardTotal = hierarchy?.counties.reduce((sum, county) => sum + countWards(county), 0) ?? 0;
  const subCountyTotal = hierarchy?.counties.reduce((sum, county) => sum + county.subCounties.length, 0) ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Light mode is the default.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant={theme === "light" ? "default" : "outline"} size="sm" onClick={() => setTheme("light")}>
            <Sun className="h-4 w-4" />
            Light
          </Button>
          <Button variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => setTheme("dark")}>
            <Moon className="h-4 w-4" />
            Dark
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your selected location</CardTitle>
          <CardDescription>Shared by the map, the dashboard, and every page.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold">{locationLabel(location)}</p>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            Reset to all of Kenya
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Platform status</CardTitle>
          <CardDescription>What is switched on in this deployment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <StatusRow
            label="AI answers"
            enabled={platform.modelConfigured}
            onText="A language model is configured, so questions get written answers grounded in the source pages."
            offText="No language model is configured. Questions still return the matching source passages, without a written summary."
          />
          <StatusRow
            label="OCR for scanned PDFs"
            enabled={platform.ocrConfigured}
            onText="Google Document AI is configured, so image-based PDFs can be read."
            offText="Scanned PDFs will report that OCR configuration is required rather than returning empty figures."
          />
          <StatusRow
            label="Durable storage"
            enabled={platform.durableStorage}
            onText="Processed documents are written to a database."
            offText="Processed documents are held in a local cache that clears when the deployment restarts."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Data sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-6 text-muted-foreground">
          <p>
            Administrative boundaries and the county, sub-county, and ward hierarchy come from {KENYA_DATA_SOURCE}:{" "}
            <strong className="text-foreground">{hierarchy?.counties.length ?? 0} counties</strong>,{" "}
            <strong className="text-foreground">{subCountyTotal} sub-counties</strong>, and{" "}
            <strong className="text-foreground">{wardTotal} wards</strong>.
          </p>
          <p>
            Budget figures come only from documents uploaded to this platform and read page by page. No figure is shown
            unless a document supplied it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusRow({
  label,
  enabled,
  onText,
  offText
}: {
  label: string;
  enabled: boolean;
  onText: string;
  offText: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${enabled ? "bg-primary" : "bg-muted-foreground/40"}`}
          aria-hidden
        />
        <p className="text-sm font-semibold">
          {label}: {enabled ? "configured" : "not configured"}
        </p>
      </div>
      <p className="mt-1 pl-4 text-xs leading-5 text-muted-foreground">{enabled ? onText : offText}</p>
    </div>
  );
}
