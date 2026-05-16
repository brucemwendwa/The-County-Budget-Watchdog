import { AdminDashboard } from "@/components/admin-dashboard";
import { getAdminDashboardData } from "@/lib/data";

export default function AdminPage() {
  return <AdminDashboard data={getAdminDashboardData()} />;
}
