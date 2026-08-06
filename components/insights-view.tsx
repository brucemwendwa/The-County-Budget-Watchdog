"use client";

import { Loader2 } from "lucide-react";

import { BudgetOverview } from "@/components/dashboard/budget-overview";
import { ClarificationsPanel } from "@/components/dashboard/clarifications";
import { KeyProjects } from "@/components/dashboard/key-projects";
import { SectorAllocationChart } from "@/components/dashboard/sector-allocation";
import { LocationPickers } from "@/components/location-pickers";
import { useLocationState } from "@/components/location-provider";
import { useInsights } from "@/components/use-insights";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatKes } from "@/lib/utils";

/** The full-width analytical view of whatever place is selected. */
export function InsightsView() {
  const { selection } = useLocationState();
  const { data, loading, error } = useInsights(selection);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4">
        <LocationPickers fieldsClassName="sm:grid-cols-3" />
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading insights…
        </p>
      ) : error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : !data ? null : data.documents.length === 0 ? (
        <EmptyState
          title={`Nothing processed for ${data.place} yet`}
          description="Insights are calculated from documents that have been uploaded and read. Add a budget PDF for this area and its figures will appear here."
        />
      ) : (
        <>
          <BudgetOverview insights={data} />

          <div className="grid gap-4 lg:grid-cols-2">
            <SectorAllocationChart sectors={data.sectors} />
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Departments</CardTitle>
                <CardDescription>Allocation by department in the extracted rows.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.departments.length === 0 ? (
                  <EmptyState
                    title="No departments extracted"
                    description="No budget rows were matched for this place, so there is no department breakdown."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                          <th scope="col" className="py-2 pr-3 font-semibold">
                            Department
                          </th>
                          <th scope="col" className="py-2 pr-3 text-right font-semibold">
                            Allocation
                          </th>
                          <th scope="col" className="py-2 pr-3 text-right font-semibold">
                            Development
                          </th>
                          <th scope="col" className="py-2 text-right font-semibold">
                            Rows
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.departments.map((department) => (
                          <tr key={department.department} className="border-b last:border-0">
                            <td className="py-2 pr-3 font-medium">{department.department}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">
                              {formatKes(department.allocationKes)}
                            </td>
                            <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                              {formatKes(department.developmentKes)}
                            </td>
                            <td className="py-2 text-right tabular-nums text-muted-foreground">
                              {department.itemCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <KeyProjects items={data.topProjects} countywideItems={data.countywideItems} place={data.place} />
          <ClarificationsPanel clarifications={data.clarifications} changes={data.changes} />
        </>
      )}
    </div>
  );
}
