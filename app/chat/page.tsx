import { ChatPage } from "@/components/chat-page";
import { getResidentDashboardData } from "@/lib/data";

export default function BudgetChatPage() {
  return <ChatPage documents={getResidentDashboardData().documents} />;
}
