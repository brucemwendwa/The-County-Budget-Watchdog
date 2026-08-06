import type { Metadata } from "next";

import { CitizenIdeasPanel } from "@/components/citizen-ideas-panel";
import { LocationPickers } from "@/components/location-pickers";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Citizen Ideas",
  description: "Share what your ward's budget should fund."
};

export default function IdeasPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Citizen ideas"
        description="Public participation starts with saying what your ward actually needs. Ideas are filed against a specific ward so they reach the people who plan that ward's budget."
      />
      <div className="rounded-xl border bg-card p-4">
        <LocationPickers fieldsClassName="sm:grid-cols-3" />
      </div>
      <CitizenIdeasPanel />
    </div>
  );
}
