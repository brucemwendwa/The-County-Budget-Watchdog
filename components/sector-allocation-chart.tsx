"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { Badge } from "@/components/ui/badge";
import type { DepartmentSummary } from "@/lib/types";
import { formatKes } from "@/lib/utils";

const SECTOR_MAP: Record<string, string> = {
  "Health Services": "Health",
  "Roads and Transport": "Roads",
  "Water and Sanitation": "Water",
  Education: "Education",
  Agriculture: "Agriculture"
};

function mapToSector(department: string): string {
  if (SECTOR_MAP[department]) return SECTOR_MAP[department];
  if (/trade|youth/i.test(department)) return "Trade / Youth";
  return "Administration / Other";
}

export function SectorAllocationChart({
  departments,
  demo = false
}: {
  departments: DepartmentSummary[];
  demo?: boolean;
}) {
  const sectorTotals = departments.reduce<Record<string, number>>((accumulator, department) => {
    const sector = mapToSector(department.department);
    accumulator[sector] = (accumulator[sector] ?? 0) + department.allocationKes;
    return accumulator;
  }, {});

  const data = Object.entries(sectorTotals).map(([name, value]) => ({ name, value }));

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No sector allocation data available.</p>;
  }

  return (
    <div className="space-y-3">
      {demo ? (
        <Badge variant="secondary" className="w-fit">
          Demo Data
        </Badge>
      ) : null}
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatKes(Number(value))}
            tick={{ fontSize: 11 }}
          />
          <Tooltip formatter={(value) => formatKes(Number(value))} />
          <Bar dataKey="value" name="Allocation" fill="#128359" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
