export type CountyStatus = "available" | "processing" | "not-analyzed" | "demo";

export type CountyEntry = {
  slug: string;
  name: string;
  status: CountyStatus;
  subCounties: Array<{
    name: string;
    wards: string[];
  }>;
};

/**
 * Only counties with extracted or sample budget rows carry the `demo` status. A county listed here
 * with `not-analyzed` has no data behind it, so the UI must say so rather than substitute another
 * county's figures.
 */
export const KENYA_COUNTIES: CountyEntry[] = [
  { slug: "nairobi", name: "Nairobi", status: "demo", subCounties: [{ name: "Dagoretti North", wards: ["Kileleshwa", "Kilimani"] }, { name: "Embakasi Central", wards: ["Kayole North", "Kayole South"] }] },
  { slug: "makueni", name: "Makueni", status: "demo", subCounties: [{ name: "Makueni", wards: ["Wote", "Kathonzweni"] }] },
  { slug: "kisumu", name: "Kisumu", status: "demo", subCounties: [{ name: "Kisumu Central", wards: ["Nyalenda A", "Market Milimani"] }] },
  { slug: "kiambu", name: "Kiambu", status: "demo", subCounties: [{ name: "Githunguri", wards: ["Githunguri", "Githiga"] }] },
  { slug: "uasin-gishu", name: "Uasin Gishu", status: "not-analyzed", subCounties: [] },
  { slug: "nakuru", name: "Nakuru", status: "not-analyzed", subCounties: [] },
  { slug: "mombasa", name: "Mombasa", status: "not-analyzed", subCounties: [] },
  { slug: "kwale", name: "Kwale", status: "not-analyzed", subCounties: [] },
  { slug: "kilifi", name: "Kilifi", status: "not-analyzed", subCounties: [] },
  { slug: "tana-river", name: "Tana River", status: "not-analyzed", subCounties: [] },
  { slug: "lamu", name: "Lamu", status: "not-analyzed", subCounties: [] },
  { slug: "taita-taveta", name: "Taita Taveta", status: "not-analyzed", subCounties: [] },
  { slug: "garissa", name: "Garissa", status: "not-analyzed", subCounties: [] },
  { slug: "wajir", name: "Wajir", status: "not-analyzed", subCounties: [] },
  { slug: "mandera", name: "Mandera", status: "not-analyzed", subCounties: [] },
  { slug: "marsabit", name: "Marsabit", status: "not-analyzed", subCounties: [] },
  { slug: "isiolo", name: "Isiolo", status: "not-analyzed", subCounties: [] },
  { slug: "meru", name: "Meru", status: "not-analyzed", subCounties: [] },
  { slug: "tharaka-nithi", name: "Tharaka Nithi", status: "not-analyzed", subCounties: [] },
  { slug: "embu", name: "Embu", status: "not-analyzed", subCounties: [] },
  { slug: "kitui", name: "Kitui", status: "not-analyzed", subCounties: [] },
  { slug: "machakos", name: "Machakos", status: "not-analyzed", subCounties: [] },
  { slug: "nyandarua", name: "Nyandarua", status: "not-analyzed", subCounties: [] },
  { slug: "nyeri", name: "Nyeri", status: "not-analyzed", subCounties: [] },
  { slug: "kirinyaga", name: "Kirinyaga", status: "not-analyzed", subCounties: [] },
  { slug: "muranga", name: "Murang'a", status: "not-analyzed", subCounties: [] },
  { slug: "turkana", name: "Turkana", status: "not-analyzed", subCounties: [] },
  { slug: "west-pokot", name: "West Pokot", status: "not-analyzed", subCounties: [] },
  { slug: "samburu", name: "Samburu", status: "not-analyzed", subCounties: [] },
  { slug: "trans-nzoia", name: "Trans Nzoia", status: "not-analyzed", subCounties: [] },
  { slug: "elgeyo-marakwet", name: "Elgeyo Marakwet", status: "not-analyzed", subCounties: [] },
  { slug: "nandi", name: "Nandi", status: "not-analyzed", subCounties: [] },
  { slug: "baringo", name: "Baringo", status: "not-analyzed", subCounties: [] },
  { slug: "laikipia", name: "Laikipia", status: "not-analyzed", subCounties: [] },
  { slug: "narok", name: "Narok", status: "not-analyzed", subCounties: [] },
  { slug: "kajiado", name: "Kajiado", status: "not-analyzed", subCounties: [] },
  { slug: "kericho", name: "Kericho", status: "not-analyzed", subCounties: [] },
  { slug: "bomet", name: "Bomet", status: "not-analyzed", subCounties: [] },
  { slug: "kakamega", name: "Kakamega", status: "not-analyzed", subCounties: [] },
  { slug: "vihiga", name: "Vihiga", status: "not-analyzed", subCounties: [] },
  { slug: "bungoma", name: "Bungoma", status: "not-analyzed", subCounties: [] },
  { slug: "busia", name: "Busia", status: "not-analyzed", subCounties: [] },
  { slug: "siaya", name: "Siaya", status: "not-analyzed", subCounties: [] },
  { slug: "homa-bay", name: "Homa Bay", status: "processing", subCounties: [] },
  { slug: "migori", name: "Migori", status: "not-analyzed", subCounties: [] },
  { slug: "kisii", name: "Kisii", status: "not-analyzed", subCounties: [] },
  { slug: "nyamira", name: "Nyamira", status: "not-analyzed", subCounties: [] }
];

export const FINANCIAL_YEARS = ["2025/2026", "2024/2025", "2023/2024"];

export function getCountyBySlug(slug: string) {
  return KENYA_COUNTIES.find((county) => county.slug === slug);
}

export function getCountyByName(name: string) {
  return KENYA_COUNTIES.find((county) => county.name === name);
}

export function statusLabel(status: CountyStatus): string {
  switch (status) {
    case "available":
      return "Available";
    case "processing":
      return "Processing";
    case "demo":
      return "Demo Data";
    default:
      return "Not Yet Analyzed";
  }
}

export const CITIZEN_QUESTIONS = [
  "Which ward will benefit from this allocation?",
  "What is the implementation timeline?",
  "Has this project appeared in previous budgets?",
  "How will residents verify progress?",
  "Which department is responsible?",
  "Was this item discussed during public participation?"
];
