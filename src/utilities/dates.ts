/**
 * Date helpers. Dates are handled as ISO strings (YYYY-MM-DD) at the edges
 * and as whole UTC day numbers (days since 1970-01-01) in calculations, so no
 * time zone or daylight saving shifts can creep in.
 */

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const isValidIsoDate = (value: string): boolean => {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
};

/** Converts a valid ISO date to a UTC day number. */
export const isoToDay = (value: string): number => {
  const [y, m, d] = value.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
};

export const dayToIso = (day: number): string =>
  new Date(day * MS_PER_DAY).toISOString().slice(0, 10);

export const addDaysIso = (value: string, days: number): string =>
  dayToIso(isoToDay(value) + days);

/** Today's date in the user's local time zone, as an ISO date. */
export const todayIso = (): string => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${now.getFullYear().toString()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/** The 1st of the `n`th month after the month containing `day`. */
export const nthFirstOfMonthAfter = (day: number, n: number): number => {
  const date = new Date(day * MS_PER_DAY);
  return (
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + n, 1) / MS_PER_DAY
  );
};

/** The first 1st of a month strictly after `day`. */
export const nextFirstOfMonthAfter = (day: number): number =>
  nthFirstOfMonthAfter(day, 1);

/** Calendar month index (years * 12 + month), for counting months. */
export const monthIndex = (day: number): number => {
  const date = new Date(day * MS_PER_DAY);
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
};

/**
 * Whole months between two days, rounded to the nearest month
 * (positive when `to` is after `from`).
 */
export const monthsBetween = (from: number, to: number): number => {
  const a = new Date(from * MS_PER_DAY);
  const b = new Date(to * MS_PER_DAY);
  const months = monthIndex(to) - monthIndex(from);
  const dayDiff = b.getUTCDate() - a.getUTCDate();
  return months + Math.round(dayDiff / 30.436875);
};
