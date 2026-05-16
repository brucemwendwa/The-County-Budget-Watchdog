import { GoogleGenerativeAI } from "@google/generative-ai";

import { buildSmsVersionsPrompt } from "@/lib/prompts";
import type { SmsDigest, SmsVersions } from "@/lib/types";

const MAX_SMS_CHARS = 160;

export async function generateSmsVersions(budgetUpdate: string): Promise<SmsVersions> {
  if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? "gemini-1.5-pro-latest",
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    });
    const result = await model.generateContent(buildSmsVersionsPrompt(budgetUpdate));
    return clampSmsVersions(JSON.parse(result.response.text()) as SmsVersions);
  }

  return fallbackSmsVersions(budgetUpdate);
}

export async function sendSmsDigest(digest: SmsDigest, recipients: string[]) {
  if (!process.env.AFRICASTALKING_API_KEY) {
    return {
      sent: false,
      reason: "AFRICASTALKING_API_KEY not configured",
      preview: digest.body,
      recipients
    };
  }

  const response = await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: {
      apiKey: process.env.AFRICASTALKING_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: new URLSearchParams({
      username: process.env.AFRICASTALKING_USERNAME ?? "sandbox",
      to: recipients.join(","),
      message: digest.body,
      from: process.env.AFRICASTALKING_SENDER_ID ?? ""
    })
  });

  return response.json();
}

function fallbackSmsVersions(budgetUpdate: string): SmsVersions {
  const compact = budgetUpdate.replace(/\s+/g, " ").trim();
  const base = compact || "Details missing in budget update.";

  return clampSmsVersions({
    formalEnglish: `${base} Ask county officials for details.`,
    simpleEnglish: `${base} Ask your MCA what changed.`,
    swahiliFriendly: `${base} Uliza MCA au kaunti maelezo.`
  });
}

function clampSmsVersions(versions: Partial<SmsVersions>): SmsVersions {
  return {
    formalEnglish: clampSms(versions.formalEnglish, "Details missing. Ask county officials for details."),
    simpleEnglish: clampSms(versions.simpleEnglish, "Details missing. Ask your MCA what changed."),
    swahiliFriendly: clampSms(versions.swahiliFriendly, "Maelezo hayatoshi. Uliza MCA au kaunti.")
  };
}

function clampSms(value: string | undefined, fallback: string) {
  const normalized = (value ?? fallback).replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_SMS_CHARS) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_SMS_CHARS - 1).trimEnd()}.`;
}
