/**
 * Shared reading of budget-document text.
 *
 * Both the row extractor and the analysis pass have to answer the same questions about a line —
 * does it carry money, is it a heading, is it a document-level total, is it prose — and they have
 * to answer them the same way. A total that the extractor treats as a project row would be counted
 * twice: once as a stated total and again inside the sum of rows.
 */

/** Below this a number is a quantity, a page reference, or a line index — not a budget figure. */
export const MIN_ALLOCATION_KES = 50_000;

/** Document-level totals. These are reported as stated figures, never as project rows. */
export const AGGREGATE_LINE_RULES: Array<{ label: string; pattern: RegExp }> = [
  { label: "Total revenue", pattern: /^total\s+(?:county\s+)?revenue|revenue\s+estimates?\s+total/i },
  { label: "Total expenditure", pattern: /^total\s+(?:gross\s+)?expenditure|^gross\s+expenditure/i },
  { label: "Development budget", pattern: /^(?:total\s+)?development\s+(?:budget|expenditure|estimates?|vote)/i },
  { label: "Recurrent budget", pattern: /^(?:total\s+)?recurrent\s+(?:budget|expenditure|estimates?|vote)/i },
  { label: "Equitable share", pattern: /^equitable\s+share/i },
  { label: "Own source revenue", pattern: /^own\s+source\s+revenue|^local\s+revenue/i },
  { label: "Conditional grants", pattern: /^conditional\s+grants?/i },
  { label: "Total budget", pattern: /^total\s+budget|^county\s+allocation|^grand\s+total/i }
];

export function matchAggregateLabel(line: string): string | null {
  return AGGREGATE_LINE_RULES.find((rule) => rule.pattern.test(line))?.label ?? null;
}

export function isAggregateLine(line: string) {
  return matchAggregateLabel(line) !== null;
}

/** Column headings and running totals inside a table. */
export function isHeaderOrTotalLine(line: string) {
  return /item description|project name|approved estimates|printed estimates|grand total|sub[- ]?total|^total\b|^financial year|page \d+ of \d+/i.test(
    line
  );
}

/**
 * Narrative sentences. Budget tables do not begin rows with "The" or "During", so a long line that
 * does is commentary about the figures rather than a figure itself.
 */
export function isProseLine(line: string) {
  const words = line.split(/\s+/).length;
  return words > 9 && /^(the|this|these|those|it|in|during|following|however|therefore|a|an|as|for the)\b/i.test(line);
}

/** Every money figure on a line, largest-first order preserved as printed. */
export function extractMoneyValues(line: string): number[] {
  const explicit = Array.from(line.matchAll(/(?:KES|KSH|Kshs?\.?)\s?([\d,]+(?:\.\d+)?)/gi)).map((match) =>
    toAmount(match[1])
  );
  if (explicit.length > 0) {
    return explicit.filter((amount) => amount >= MIN_ALLOCATION_KES);
  }

  return Array.from(line.matchAll(/\b([1-9]\d{0,2}(?:,\d{3})+|[1-9]\d{5,})(?:\.\d{2})?\b/g))
    .map((match) => toAmount(match[1]))
    .filter((amount) => amount >= MIN_ALLOCATION_KES);
}

export function firstAmountIn(line: string): number | null {
  const amounts = extractMoneyValues(line);
  return amounts.length > 0 ? amounts[0] : null;
}

/**
 * Totals are printed beside comparison columns, and the figure being labelled is the largest on the
 * line often enough that taking the maximum beats taking the first.
 */
export function largestAmountIn(line: string): number | null {
  const amounts = extractMoneyValues(line).filter((amount) => amount >= 100_000);
  return amounts.length > 0 ? Math.max(...amounts) : null;
}

function toAmount(value: string) {
  return Math.round(Number(value.replaceAll(",", "")));
}

/** Splits a page into normalised, non-empty lines. */
export function toLines(pageText: string): string[] {
  return pageText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}
