import {
  budgetDocuments,
  departmentSummaries,
  smsDigests,
  suspiciousChanges,
  wardAllocations
} from "@/data/sample-budget";

export function getResidentDashboardData() {
  return {
    documents: budgetDocuments,
    allocations: wardAllocations,
    departments: departmentSummaries,
    changes: suspiciousChanges
  };
}

export function getAdminDashboardData() {
  return {
    documents: budgetDocuments,
    allocations: wardAllocations,
    departments: departmentSummaries,
    changes: suspiciousChanges,
    digests: smsDigests
  };
}

export function searchAllocations(query: string) {
  const normalized = query.toLowerCase();

  return wardAllocations.filter((allocation) =>
    [
      allocation.ward,
      allocation.constituency,
      allocation.department,
      allocation.programme,
      allocation.project,
      allocation.county
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized)
  );
}
