import { LandingPage } from "@/components/landing-page";
import { getAdminDashboardData } from "@/lib/data";

export default function Home() {
  const data = getAdminDashboardData();
  return <LandingPage departments={data.departments} smsPreview={data.digests[0]} />;
}
