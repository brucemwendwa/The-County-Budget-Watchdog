import { WatchdogAlertsPage } from "@/components/watchdog-alerts-page";
import { getResidentDashboardData } from "@/lib/data";
import { detectBudgetLeaks } from "@/lib/leak-detector";

export default function AlertsPage() {
  const data = getResidentDashboardData();
  return <WatchdogAlertsPage changes={data.changes} documents={data.documents} leakReport={detectBudgetLeaks()} />;
}
