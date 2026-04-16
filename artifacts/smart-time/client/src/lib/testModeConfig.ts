export type TestMode = "IELTS" | "CEFR" | "BOTH";
export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export const CEFR_DESCRIPTORS: Record<CEFRLevel, string> = {
  C2: "Mastery — Can understand with ease virtually everything heard or read.",
  C1: "Advanced — Can express ideas fluently and spontaneously without much searching.",
  B2: "Upper Intermediate — Can interact with a degree of fluency and spontaneity.",
  B1: "Intermediate — Can deal with most situations likely to arise whilst travelling.",
  A2: "Elementary — Can understand sentences and frequently used expressions.",
  A1: "Beginner — Can understand and use familiar everyday expressions.",
};

export const CEFR_COLORS: Record<CEFRLevel, { bg: string; text: string; border: string; badge: string }> = {
  C2: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-300", badge: "bg-violet-100 text-violet-700" },
  C1: { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-300",   badge: "bg-blue-100 text-blue-700" },
  B2: { bg: "bg-emerald-50",text: "text-emerald-700",border: "border-emerald-300",badge: "bg-emerald-100 text-emerald-700" },
  B1: { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-300",  badge: "bg-amber-100 text-amber-700" },
  A2: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-300", badge: "bg-orange-100 text-orange-700" },
  A1: { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-300",    badge: "bg-red-100 text-red-700" },
};

export function bandToCEFR(band: number | string): CEFRLevel {
  const b = parseFloat(String(band));
  if (isNaN(b)) return "B1";
  if (b >= 8.5) return "C2";
  if (b >= 7.0) return "C1";
  if (b >= 5.5) return "B2";
  if (b >= 4.5) return "B1";
  if (b >= 3.0) return "A2";
  return "A1";
}

export function scoreToBand(score: number, total: number): string {
  if (total === 0) return "—";
  const pct = score / total;
  if (pct >= 0.95) return "9.0";
  if (pct >= 0.88) return "8.5";
  if (pct >= 0.80) return "8.0";
  if (pct >= 0.72) return "7.5";
  if (pct >= 0.65) return "7.0";
  if (pct >= 0.58) return "6.5";
  if (pct >= 0.50) return "6.0";
  if (pct >= 0.43) return "5.5";
  if (pct >= 0.35) return "5.0";
  if (pct >= 0.28) return "4.5";
  if (pct >= 0.22) return "4.0";
  if (pct >= 0.15) return "3.5";
  if (pct >= 0.10) return "3.0";
  return "2.5";
}

export const MODE_LABELS: Record<TestMode, string> = {
  IELTS: "IELTS",
  CEFR: "CEFR",
  BOTH: "IELTS + CEFR",
};

export const MODE_DESCRIPTIONS: Record<TestMode, string> = {
  IELTS: "Show band scores (0–9)",
  CEFR: "Show CEFR levels (A1–C2)",
  BOTH: "Show both band scores and CEFR levels",
};
