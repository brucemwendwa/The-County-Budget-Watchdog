import type {
  BudgetDocument,
  DepartmentSummary,
  SmsDigest,
  SuspiciousChange,
  WardAllocation
} from "@/lib/types";

export const budgetDocuments: BudgetDocument[] = [
  {
    id: "doc-nairobi-cbp-2025",
    county: "Nairobi",
    title: "Nairobi City County Approved Programme Based Budget",
    fiscalYear: "2025/2026",
    type: "approved-budget",
    status: "published",
    uploadedAt: "2026-04-18T08:30:00Z",
    pages: 418,
    sourceUrl: "/demo/nairobi-budget.pdf"
  },
  {
    id: "doc-makueni-supp-2025",
    county: "Makueni",
    title: "Makueni County First Supplementary Budget",
    fiscalYear: "2025/2026",
    type: "supplementary-budget",
    status: "review-ready",
    uploadedAt: "2026-05-02T11:20:00Z",
    pages: 164
  },
  {
    id: "doc-kisumu-implementation-q3",
    county: "Kisumu",
    title: "Kisumu County Q3 Budget Implementation Report",
    fiscalYear: "2025/2026",
    type: "implementation-report",
    status: "needs-attention",
    uploadedAt: "2026-05-12T05:45:00Z",
    pages: 92
  },
  {
    id: "doc-nairobi-expenditure-q3",
    county: "Nairobi",
    title: "Nairobi City County Q3 Expenditure Report",
    fiscalYear: "2025/2026",
    type: "expenditure-report",
    status: "published",
    uploadedAt: "2026-05-10T06:20:00Z",
    pages: 118
  }
];

export const wardAllocations: WardAllocation[] = [
  {
    id: "alloc-001",
    county: "Nairobi",
    ward: "Kileleshwa",
    constituency: "Dagoretti North",
    department: "Health Services",
    programme: "Primary Health Care",
    project: "Upgrade Kileleshwa Level 3 clinic maternity wing",
    fiscalYear: "2025/2026",
    allocationKes: 42000000,
    expenditureKes: 9600000,
    budgetType: "development",
    page: 211,
    confidence: 0.88,
    status: "underspent"
  },
  {
    id: "alloc-002",
    county: "Nairobi",
    ward: "Kileleshwa",
    constituency: "Dagoretti North",
    department: "Roads and Transport",
    programme: "Access Roads",
    project: "Drainage and footpath repairs along Mandera Road",
    fiscalYear: "2025/2026",
    allocationKes: 18000000,
    expenditureKes: 17100000,
    budgetType: "development",
    page: 252,
    confidence: 0.91,
    status: "on-track"
  },
  {
    id: "alloc-003",
    county: "Nairobi",
    ward: "Kayole North",
    constituency: "Embakasi Central",
    department: "Water and Sanitation",
    programme: "Urban Water Access",
    project: "Kayole sewer line extension and storm-water channels",
    fiscalYear: "2025/2026",
    allocationKes: 65000000,
    expenditureKes: 12000000,
    budgetType: "development",
    page: 287,
    confidence: 0.84,
    status: "underspent"
  },
  {
    id: "alloc-004",
    county: "Makueni",
    ward: "Wote",
    constituency: "Makueni",
    department: "Agriculture",
    programme: "Food Security",
    project: "Ward irrigation kits and farmer aggregation centre",
    fiscalYear: "2025/2026",
    allocationKes: 31500000,
    expenditureKes: 25200000,
    budgetType: "development",
    page: 119,
    confidence: 0.9,
    status: "on-track"
  },
  {
    id: "alloc-005",
    county: "Kisumu",
    ward: "Nyalenda A",
    constituency: "Kisumu Central",
    department: "Education",
    programme: "ECDE Infrastructure",
    project: "Two ECDE classrooms and sanitation block",
    fiscalYear: "2025/2026",
    allocationKes: 22000000,
    expenditureKes: 4500000,
    budgetType: "development",
    page: 74,
    confidence: 0.82,
    status: "changed"
  },
  {
    id: "alloc-006",
    county: "Kiambu",
    ward: "Githunguri",
    constituency: "Githunguri",
    department: "Health Services",
    programme: "County Referral and Primary Care",
    project: "Medical equipment and community health promoter kits",
    fiscalYear: "2025/2026",
    allocationKes: 27500000,
    expenditureKes: 28100000,
    budgetType: "recurrent",
    page: 143,
    confidence: 0.87,
    status: "overspent"
  }
];

export const departmentSummaries: DepartmentSummary[] = [
  {
    department: "Health Services",
    allocationKes: 69500000,
    expenditureKes: 37700000,
    developmentKes: 42000000,
    recurrentKes: 27500000
  },
  {
    department: "Roads and Transport",
    allocationKes: 18000000,
    expenditureKes: 17100000,
    developmentKes: 18000000,
    recurrentKes: 0
  },
  {
    department: "Water and Sanitation",
    allocationKes: 65000000,
    expenditureKes: 12000000,
    developmentKes: 65000000,
    recurrentKes: 0
  },
  {
    department: "Agriculture",
    allocationKes: 31500000,
    expenditureKes: 25200000,
    developmentKes: 31500000,
    recurrentKes: 0
  },
  {
    department: "Education",
    allocationKes: 22000000,
    expenditureKes: 4500000,
    developmentKes: 22000000,
    recurrentKes: 0
  }
];

export const suspiciousChanges: SuspiciousChange[] = [
  {
    id: "risk-001",
    county: "Kisumu",
    ward: "Nyalenda A",
    department: "Education",
    description: "ECDE classroom allocation reduced after amendment without a matching project note.",
    beforeKes: 34000000,
    afterKes: 22000000,
    deltaKes: -12000000,
    risk: "high",
    sourcePage: 38,
    detectedAt: "2026-05-13T07:10:00Z"
  },
  {
    id: "risk-002",
    county: "Nairobi",
    ward: "Kayole North",
    department: "Water and Sanitation",
    description: "Large allocation remains below 20% absorption late in the financial year.",
    beforeKes: 65000000,
    afterKes: 65000000,
    deltaKes: 0,
    risk: "medium",
    sourcePage: 287,
    detectedAt: "2026-05-14T09:15:00Z"
  }
];

export const smsDigests: SmsDigest[] = [
  {
    id: "sms-001",
    county: "Nairobi",
    ward: "Kileleshwa",
    language: "english",
    status: "draft",
    createdAt: "2026-05-15T12:00:00Z",
    body:
      "Kileleshwa budget update: KES 42M is planned for the Level 3 clinic maternity wing. Only KES 9.6M is recorded as spent. Ask your MCA for the project status and timeline."
  },
  {
    id: "sms-002",
    county: "Kisumu",
    ward: "Nyalenda A",
    language: "swahili",
    status: "approved",
    createdAt: "2026-05-15T13:25:00Z",
    body:
      "Nyalenda A: Bajeti ya madarasa ya ECDE ilipunguzwa kutoka KES 34M hadi KES 22M. Uliza ofisi ya wadi sababu na mpango mpya."
  }
];
