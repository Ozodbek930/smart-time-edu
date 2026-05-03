/**
 * IELTS Raw Score to Band Score mapping (Listening & Reading)
 * Based on general Academic module standards.
 */
export function rawToIELTSBand(score: number, total: number = 40): string {
  if (total === 0) return "0";
  // If total is not 40, we normalize it
  const normalized = (score / total) * 40;
  
  if (normalized >= 39) return "9.0";
  if (normalized >= 37) return "8.5";
  if (normalized >= 35) return "8.0";
  if (normalized >= 32) return "7.5";
  if (normalized >= 30) return "7.0";
  if (normalized >= 27) return "6.5";
  if (normalized >= 23) return "6.0";
  if (normalized >= 20) return "5.5";
  if (normalized >= 16) return "5.0";
  if (normalized >= 13) return "4.5";
  if (normalized >= 10) return "4.0";
  if (normalized >= 6) return "3.5";
  if (normalized >= 4) return "3.0";
  if (normalized >= 2) return "2.5";
  return "0";
}

/**
 * IELTS Band Score to CEFR Level mapping
 */
export function ieltsToCEFR(band: string | number): string {
  const b = typeof band === "string" ? parseFloat(band) : band;
  if (b >= 8.5) return "C2";
  if (b >= 7.0) return "C1";
  if (b >= 5.5) return "B2";
  if (b >= 4.0) return "B1";
  if (b >= 3.0) return "A2";
  return "A1";
}

/**
 * Calculates the overall IELTS band from 4 sections.
 * Rule: Average is rounded to the nearest 0.5.
 * .25 rounds up to .5, .75 rounds up to next whole number.
 */
export function calculateOverallBand(bands: (string | number | undefined | null)[]): string {
  const validBands = bands
    .map(b => (typeof b === "string" ? parseFloat(b) : b))
    .filter((b): b is number => b !== undefined && b !== null && !isNaN(b));

  if (validBands.length === 0) return "0";

  const avg = validBands.reduce((sum, b) => sum + b, 0) / validBands.length;
  
  // Standard IELTS rounding
  const integerPart = Math.floor(avg);
  const fractionalPart = avg - integerPart;

  if (fractionalPart < 0.25) return integerPart.toFixed(1);
  if (fractionalPart < 0.75) return (integerPart + 0.5).toFixed(1);
  return (integerPart + 1).toFixed(1);
}
