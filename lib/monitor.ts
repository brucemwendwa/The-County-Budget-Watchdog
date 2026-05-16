import { GoogleGenerativeAI } from "@google/generative-ai";

import { suspiciousChanges } from "@/data/sample-budget";
import { buildAmendmentAnalysisPrompt } from "@/lib/prompts";
import type { AmendmentAlert, AmendmentAnalysis } from "@/lib/types";

export async function monitorBudgetChanges() {
  return {
    checkedAt: new Date().toISOString(),
    sources: [
      "County gazette notices",
      "Supplementary budget PDFs",
      "Controller of Budget implementation reports",
      "County Assembly order papers"
    ],
    alerts: suspiciousChanges,
    nextRun: "Daily at 06:00 Africa/Nairobi"
  };
}

export async function analyzeBudgetAmendment(
  originalBudget: string,
  amendedBudget: string
): Promise<AmendmentAnalysis> {
  if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? "gemini-1.5-pro-latest",
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    });
    const result = await model.generateContent(buildAmendmentAnalysisPrompt(originalBudget, amendedBudget));
    return normalizeAmendmentAnalysis(JSON.parse(result.response.text()) as AmendmentAnalysis);
  }

  return fallbackAmendmentAnalysis(originalBudget, amendedBudget);
}

function fallbackAmendmentAnalysis(originalBudget: string, amendedBudget: string): AmendmentAnalysis {
  const originalAmounts = extractNamedAmounts(originalBudget);
  const amendedAmounts = extractNamedAmounts(amendedBudget);
  const projectNames = Array.from(new Set([...Object.keys(originalAmounts), ...Object.keys(amendedAmounts)]));
  const alerts: AmendmentAlert[] = [];

  for (const project of projectNames) {
    const beforeKes = originalAmounts[project] ?? null;
    const afterKes = amendedAmounts[project] ?? null;
    const amountChangedKes = beforeKes !== null && afterKes !== null ? afterKes - beforeKes : null;
    const lowerProject = project.toLowerCase();
    const vague = /miscellaneous|administration|other expenses|consultancy/.test(lowerProject);

    if (beforeKes === afterKes && !vague) {
      continue;
    }

    const changeType: AmendmentAlert["changeType"] =
      beforeKes === null
        ? "added"
        : afterKes === null
          ? "removed"
          : vague
            ? "vague-name"
            : amountChangedKes !== null && amountChangedKes > 0
              ? "increased"
              : "reduced";
    const riskLevel: AmendmentAlert["riskLevel"] =
      afterKes === null || vague || Math.abs(amountChangedKes ?? 0) > 10_000_000 ? "High" : "Medium";

    alerts.push({
      riskLevel,
      changeType,
      project,
      wardOrSector: "Not stated in parsed text",
      department: "Not stated in parsed text",
      programme: "Not stated in parsed text",
      summaryOfChange: summarizeChange(project, beforeKes, afterKes, amountChangedKes),
      beforeKes,
      afterKes,
      amountChangedKes,
      sourcePages: [
        { document: "Original budget" as const, page: 0, section: "Page missing in provided text" },
        { document: "Amended budget" as const, page: 0, section: "Page missing in provided text" }
      ],
      whyItMatters:
        "Residents need to know whether promised services gained money, lost money, or disappeared from the amended budget.",
      questionResidentsShouldAsk:
        "Why was this allocation changed, and what service delivery timeline should residents now expect?"
    });
  }

  return normalizeAmendmentAnalysis({
    overallRisk: alerts.some((alert) => alert.riskLevel === "High") ? "High" : alerts.length ? "Medium" : "Low",
    summary: alerts.length
      ? `${alerts.length} budget change alert(s) found from the supplied text. Review source pages before publication.`
      : "No allocation changes were detected in the supplied text.",
    alerts
  });
}

function extractNamedAmounts(text: string) {
  const amounts: Record<string, number> = {};
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const line of lines) {
    const amountMatch = line.match(/(?:KES|KSH|Kshs?\.?)\s?([\d,]+)/i);
    if (!amountMatch) {
      continue;
    }

    const project = line.replace(amountMatch[0], "").replace(/page\s+\d+/i, "").trim();
    if (project.length < 3) {
      continue;
    }

    amounts[project.slice(0, 140)] = Number(amountMatch[1].replaceAll(",", ""));
  }

  return amounts;
}

function summarizeChange(project: string, beforeKes: number | null, afterKes: number | null, amountChangedKes: number | null) {
  if (beforeKes === null) {
    return `${project} appears as a new project in the amended budget.`;
  }
  if (afterKes === null) {
    return `${project} appears to have been removed from the amended budget.`;
  }
  return `${project} changed from KES ${beforeKes.toLocaleString("en-KE")} to KES ${afterKes.toLocaleString(
    "en-KE"
  )}, a change of KES ${(amountChangedKes ?? 0).toLocaleString("en-KE")}.`;
}

function normalizeAmendmentAnalysis(analysis: AmendmentAnalysis): AmendmentAnalysis {
  return {
    overallRisk: normalizeRisk(analysis.overallRisk),
    summary: analysis.summary || "No summary provided.",
    alerts: (analysis.alerts ?? []).map((alert) => ({
      ...alert,
      riskLevel: normalizeRisk(alert.riskLevel),
      sourcePages: alert.sourcePages?.length
        ? alert.sourcePages
        : [
            { document: "Original budget" as const, page: 0, section: "Source page missing" },
            { document: "Amended budget" as const, page: 0, section: "Source page missing" }
          ]
    }))
  };
}

function normalizeRisk(risk: string): AmendmentAnalysis["overallRisk"] {
  if (risk === "High" || risk === "Medium" || risk === "Low") {
    return risk;
  }

  return "Medium";
}
