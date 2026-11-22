import { describe, expect, it } from "vitest";

import {
  addDaysIso,
  dayToIso,
  isValidIsoDate,
  isoToDay,
  monthsBetween,
  nextFirstOfMonthAfter,
  nthFirstOfMonthAfter
} from "./dates";

describe("dates", () => {
  it("validates ISO dates", () => {
    expect(isValidIsoDate("2026-02-28")).toBe(true);
    expect(isValidIsoDate("2028-02-29")).toBe(true);
    expect(isValidIsoDate("2026-02-29")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("2026-1_-__")).toBe(false);
    expect(isValidIsoDate("")).toBe(false);
  });

  it("round-trips days and ISO strings", () => {
    expect(dayToIso(isoToDay("2026-11-21"))).toBe("2026-11-21");
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysIso("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("finds the first 1st strictly after a date", () => {
    expect(dayToIso(nextFirstOfMonthAfter(isoToDay("2026-11-21")))).toBe(
      "2026-12-01"
    );
    expect(dayToIso(nextFirstOfMonthAfter(isoToDay("2026-11-01")))).toBe(
      "2026-12-01"
    );
    expect(dayToIso(nthFirstOfMonthAfter(isoToDay("2026-11-21"), 360))).toBe(
      "2056-11-01"
    );
  });

  it("counts months between dates", () => {
    expect(monthsBetween(isoToDay("2026-01-01"), isoToDay("2028-07-01"))).toBe(
      30
    );
    expect(monthsBetween(isoToDay("2028-07-01"), isoToDay("2026-01-01"))).toBe(
      -30
    );
  });
});
