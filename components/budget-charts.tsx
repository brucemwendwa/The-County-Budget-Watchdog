"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { DepartmentSummary } from "@/lib/types";
import { formatKes } from "@/lib/utils";

const COLORS = ["#128359", "#d61f2a", "#f5b942", "#2979a8", "#6b7280"];

export function DepartmentBarChart({ departments }: { departments: DepartmentSummary[] }) {
  const data = departments.map((department) => ({
    name: department.department.replace(" Services", ""),
    allocated: department.allocationKes,
    spent: department.expenditureKes
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: -8, right: 8, top: 12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => formatKes(Number(value))}
        />
        <Tooltip formatter={(value) => formatKes(Number(value))} />
        <Bar dataKey="allocated" name="Allocated" radius={[6, 6, 0, 0]} fill="#128359" />
        <Bar dataKey="spent" name="Spent" radius={[6, 6, 0, 0]} fill="#2979a8" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DevelopmentPieChart({ departments }: { departments: DepartmentSummary[] }) {
  const development = departments.reduce((sum, item) => sum + item.developmentKes, 0);
  const recurrent = departments.reduce((sum, item) => sum + item.recurrentKes, 0);
  const data = [
    { name: "Development", value: development },
    { name: "Recurrent", value: recurrent }
  ];

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={4}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatKes(Number(value))} />
      </PieChart>
    </ResponsiveContainer>
  );
}

