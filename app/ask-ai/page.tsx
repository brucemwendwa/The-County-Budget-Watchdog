import { AskAiPage } from "@/components/ask-ai-page";
import { getResidentDashboardData } from "@/lib/data";

export default function AskAiRoute() {
  return <AskAiPage documents={getResidentDashboardData().documents} />;
}
