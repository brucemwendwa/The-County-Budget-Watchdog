import { DocumentsPage } from "@/components/documents-page";
import { getResidentDashboardData } from "@/lib/data";

export default function DocumentsRoute() {
  return <DocumentsPage documents={getResidentDashboardData().documents} />;
}
