import { ResidentDashboard } from "@/components/resident-dashboard";
import { getResidentDashboardData } from "@/lib/data";

export default function DashboardPage() {
  return <ResidentDashboard data={getResidentDashboardData()} />;
}
