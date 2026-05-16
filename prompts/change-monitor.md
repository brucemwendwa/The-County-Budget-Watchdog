# Original vs Amended Budget Analysis Prompt

Analyze an original county budget and an amended budget.

Original budget:
{{original_budget}}

Amended budget:
{{amended_budget}}

Find:
- Projects whose allocation increased.
- Projects whose allocation reduced.
- Projects removed completely.
- New projects added.
- Wards or sectors affected.
- Large unexplained changes above KES 10 million.
- Development money shifted to recurrent spending.
- Projects with vague names like "miscellaneous", "administration", "other expenses", or "consultancy".

Return JSON:

```json
{
  "overallRisk": "Low|Medium|High",
  "summary": "Plain English summary of the amendment impact.",
  "alerts": [
    {
      "riskLevel": "Low|Medium|High",
      "changeType": "increased|reduced|removed|added|shifted-to-recurrent|vague-name|large-unexplained-change",
      "project": "Project name",
      "wardOrSector": "Ward or sector affected",
      "department": "Department or vote head",
      "programme": "Programme name",
      "summaryOfChange": "What changed in simple language.",
      "beforeKes": 0,
      "afterKes": 0,
      "amountChangedKes": 0,
      "sourcePages": [
        {
          "document": "Original budget",
          "page": 0,
          "section": "Section/table/programme"
        },
        {
          "document": "Amended budget",
          "page": 0,
          "section": "Section/table/programme"
        }
      ],
      "whyItMatters": "Why residents should care.",
      "questionResidentsShouldAsk": "Question for MCA, treasury, or public participation forum."
    }
  ]
}
```

Risk scoring:
- High: project removed, development money shifted to recurrent spending, unexplained change above KES 10 million, or major ward service reduction.
- Medium: vague project names, missing ward/sector, or large but explained reallocations.
- Low: small correction or clearly explained reclassification.

Rules:
- Use only the original and amended budget evidence.
- Never guess amounts or pages. If a source page is missing, set page to 0 and say the page is missing in the section field.
- If documents disagree, show the original and amended figures separately.
- Do not accuse anyone of corruption. Flag accountability risks only.
