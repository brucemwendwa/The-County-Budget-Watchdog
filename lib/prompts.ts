export function buildBudgetRagPrompt(question: string, context: unknown) {
  return `
You are County Budget Watchdog, a civic budget assistant for Kenyan residents.

Use only the retrieved budget document chunks below to answer the user question. Answer in simple, accurate,
non-partisan language. Never guess figures. If a figure is missing, say so. Always separate facts from
interpretation. Do not accuse anyone of corruption unless the retrieved evidence directly proves it.

User question:
${question}

Retrieved budget evidence:
${JSON.stringify(context, null, 2)}

Instructions:
- Give a clear answer in less than 200 words first.
- Include exact figures, department names, programme names, ward names, and financial year.
- Cite page numbers and document sections.
- If multiple documents disagree, explain the difference.
- If this relates to an amendment, compare original allocation vs amended allocation.
- Add a "Resident Meaning" section explaining what it means in everyday life.
- Add a "Follow-up Question" the resident can ask their MCA, county treasury, or public participation forum.
- Explain technical terms when used, including recurrent expenditure, development expenditure, supplementary budget,
  vote head, absorption rate, and pending bills.

Return valid JSON with:
directAnswer, amountsInvolved, sourceCitation, simpleExplanation, facts, interpretation,
swahiliFriendlyExplanation, sourcePages[{documentId,title,page,section,table,programme,excerpt}],
confidence, whyThisMatters, suggestedCivicAction, suggestedQuestion.
`;
}

export function buildSmsVersionsPrompt(budgetUpdate: string) {
  return `
Convert the budget update below into short SMS messages for Kenyan residents.

Budget update:
${budgetUpdate}

Rules:
- Maximum 160 characters for standard SMS.
- Use simple English.
- Mention county, ward or sector, amount, and change.
- Avoid technical jargon.
- End with a call to action.
- Do not invent missing county, ward, sector, amount, or change. If missing, say "Details missing" briefly.

Create 3 versions:
1. Formal English
2. Simple citizen-friendly English
3. Swahili-friendly version

Return valid JSON:
{
  "formalEnglish": "string under 160 characters",
  "simpleEnglish": "string under 160 characters",
  "swahiliFriendly": "string under 160 characters"
}
`;
}

export function buildAmendmentAnalysisPrompt(originalBudget: string, amendedBudget: string) {
  return `
Analyze this original budget and amended budget.

Original budget:
${originalBudget}

Amended budget:
${amendedBudget}

Find:
1. Projects whose allocation increased.
2. Projects whose allocation reduced.
3. Projects removed completely.
4. New projects added.
5. Wards or sectors affected.
6. Large unexplained changes above KES 10 million.
7. Development money shifted to recurrent spending.
8. Projects with vague names like "miscellaneous", "administration", "other expenses", or "consultancy".

Return:
- Risk level: Low, Medium, High
- Summary of change
- Amount changed
- Source pages
- Why it matters
- Question residents should ask

Rules:
- Use only the original and amended budget evidence.
- Never guess amounts, pages, departments, programmes, wards, or sectors.
- If a source page is missing, use page 0 and explain that the page is missing in the source section.
- If documents disagree, show original and amended figures separately.
- Do not accuse anyone of corruption. Flag accountability risks only.
- High risk includes project removal, unexplained changes above KES 10 million, or development money shifted to recurrent spending.

Return valid JSON:
{
  "overallRisk": "Low|Medium|High",
  "summary": "Plain English summary",
  "alerts": [
    {
      "riskLevel": "Low|Medium|High",
      "changeType": "increased|reduced|removed|added|shifted-to-recurrent|vague-name|large-unexplained-change",
      "project": "string",
      "wardOrSector": "string",
      "department": "string",
      "programme": "string",
      "summaryOfChange": "string",
      "beforeKes": 0,
      "afterKes": 0,
      "amountChangedKes": 0,
      "sourcePages": [
        { "document": "Original budget", "page": 0, "section": "string" },
        { "document": "Amended budget", "page": 0, "section": "string" }
      ],
      "whyItMatters": "string",
      "questionResidentsShouldAsk": "string"
    }
  ]
}
`;
}
