import { HomeWorkspace } from "@/components/home-workspace";
import { getDocumentedCounties } from "@/lib/location-insights";

/** Coverage depends on what has been uploaded, so this page is rendered per request. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const documentedCounties = await getDocumentedCounties();

  return <HomeWorkspace documentedCounties={documentedCounties} />;
}
