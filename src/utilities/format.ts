import type { PaymentFrequency } from "../types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

/** Rounds to 2 decimals for display only (7.8). */
export const formatCurrency = (value: number): string =>
  currency.format(Math.abs(value) < 0.005 ? 0 : value);

export const FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  monthly: "Monthly",
  biweekly: "Bi-weekly",
  acceleratedBiweekly: "Accelerated bi-weekly",
  weekly: "Weekly"
};

/** e.g. "Bi-weekly payment" (7.5). */
export const paymentLabel = (frequency: PaymentFrequency): string =>
  `${FREQUENCY_LABELS[frequency]} payment`;

const plural = (count: number, unit: string) =>
  `${count.toString()} ${unit}${count === 1 ? "" : "s"}`;

/** e.g. 366 → "30 years, 6 months". */
export const formatMonths = (totalMonths: number): string => {
  const rounded = Math.max(0, Math.round(totalMonths));
  const years = Math.floor(rounded / 12);
  const months = rounded % 12;
  if (years === 0) return plural(months, "month");
  if (months === 0) return plural(years, "year");
  return `${plural(years, "year")}, ${plural(months, "month")}`;
};

export type Better = "lower" | "higher" | "neutral";

export interface Difference {
  text: string;
  /** Whether the change is an improvement, a worsening, or neither. */
  tone: "good" | "bad" | "neutral";
  /** Whether the value is above or below the baseline. */
  direction: "up" | "down" | "none";
}

const tone = (diff: number, better: Better): Difference["tone"] => {
  if (diff === 0 || better === "neutral") return "neutral";
  return diff < 0 === (better === "lower") ? "good" : "bad";
};

/** Signed difference from the baseline, e.g. "−$1,234.56". */
export const currencyDifference = (
  value: number,
  baseline: number,
  better: Better = "lower"
): Difference => {
  const diff = Math.round((value - baseline) * 100) / 100;
  if (diff === 0)
    return { text: "no change", tone: "neutral", direction: "none" };
  const sign = diff > 0 ? "+" : "−";
  return {
    text: `${sign}${formatCurrency(Math.abs(diff))}`,
    tone: tone(diff, better),
    direction: diff > 0 ? "up" : "down"
  };
};

/** Difference in time from the baseline, e.g. "2 years, 3 months sooner". */
export const monthsDifference = (
  value: number,
  baseline: number
): Difference => {
  const diff = Math.round(value - baseline);
  if (diff === 0)
    return { text: "no change", tone: "neutral", direction: "none" };
  return {
    text: `${formatMonths(Math.abs(diff))} ${diff < 0 ? "sooner" : "later"}`,
    tone: diff < 0 ? "good" : "bad",
    direction: diff > 0 ? "up" : "down"
  };
};
