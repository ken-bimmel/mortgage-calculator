import { describe, expect, it } from "vitest";

import { defaultLoan } from "./share";
import {
  createEvent,
  defaultDateForInsert,
  frequencyBefore,
  insertEvent,
  moveEvent,
  removeEvent,
  validateEventDates
} from "./timeline";

import type { TimelineEvent } from "../types";

const loan = defaultLoan("2026-01-15");
const context = { termMonths: 360, paymentFrequency: "monthly" as const };
const lump = (id: string, date: string): TimelineEvent =>
  createEvent("lumpSum", date, context, id);

describe("createEvent", () => {
  it("defaults the new term of recasts and refinances to the original term", () => {
    const recast = createEvent("recast", "2027-01-01", context);
    const refinance = createEvent("refinance", "2027-01-01", context);
    expect(recast).toMatchObject({
      newTermMonths: 360,
      principalPayment: null,
      recastFee: null
    });
    expect(refinance).toMatchObject({
      newTermMonths: 360,
      newInterestRate: null,
      closingCosts: null,
      cashOutAmount: null,
      rollCostsIntoPrincipal: false
    });
  });

  it("starts amounts empty", () => {
    expect(createEvent("lumpSum", "2027-01-01", context)).toMatchObject({
      amount: null
    });
    expect(createEvent("extraPayment", "2027-01-01", context)).toMatchObject({
      amount: null
    });
  });
});

describe("defaultDateForInsert", () => {
  it("is one day after the loan start for the first event", () => {
    expect(defaultDateForInsert(loan.startDate, [], 0)).toBe("2026-01-16");
  });

  it("is one day after the previous event", () => {
    const events = [lump("a", "2027-03-10"), lump("b", "2028-01-01")];
    expect(defaultDateForInsert(loan.startDate, events, 1)).toBe("2027-03-11");
    expect(defaultDateForInsert(loan.startDate, events, 2)).toBe("2028-01-02");
  });

  it("skips previous events with invalid dates", () => {
    const events = [lump("a", "2027-03-10"), lump("b", "2027-0")];
    expect(defaultDateForInsert(loan.startDate, events, 2)).toBe("2027-03-11");
  });
});

describe("insertEvent", () => {
  it("inserts at the clicked segment's position", () => {
    const events = [lump("a", "2027-01-01"), lump("b", "2029-01-01")];
    const result = insertEvent(loan, events, 1, "recast", "new");
    expect(result.map((e) => e.id)).toEqual(["a", "new", "b"]);
    expect(result[1].date).toBe("2027-01-02");
  });

  it("defaults a frequency change to the frequency in effect", () => {
    const events: TimelineEvent[] = [
      {
        id: "f",
        type: "paymentFrequency",
        date: "2027-01-01",
        paymentFrequency: "weekly"
      }
    ];
    const result = insertEvent(loan, events, 1, "paymentFrequency", "new");
    expect(result[1]).toMatchObject({ paymentFrequency: "weekly" });
    expect(frequencyBefore(loan, events, 0)).toBe("monthly");
  });
});

describe("removeEvent", () => {
  it("removes by id", () => {
    const events = [lump("a", "2027-01-01"), lump("b", "2028-01-01")];
    expect(removeEvent(events, "a").map((e) => e.id)).toEqual(["b"]);
  });
});

describe("moveEvent", () => {
  const events = [
    lump("a", "2027-01-01"),
    lump("b", "2028-01-01"),
    lump("c", "2029-01-01")
  ];

  it("sets the day after the event above when dragged later", () => {
    const result = moveEvent(events, 0, 2);
    expect(result.map((e) => e.id)).toEqual(["b", "c", "a"]);
    expect(result[2].date).toBe("2029-01-02");
  });

  it("sets the day before the event below when dragged earlier", () => {
    const result = moveEvent(events, 2, 0);
    expect(result.map((e) => e.id)).toEqual(["c", "a", "b"]);
    expect(result[0].date).toBe("2026-12-31");
  });

  it("moves between two events", () => {
    const result = moveEvent(events, 0, 1);
    expect(result.map((e) => e.id)).toEqual(["b", "a", "c"]);
    expect(result[1].date).toBe("2028-01-02");
  });

  it("does nothing when not moved", () => {
    expect(moveEvent(events, 1, 1)).toEqual(events);
  });
});

describe("validateEventDates", () => {
  it("accepts chronological and same-day events", () => {
    const events = [
      lump("a", "2027-01-01"),
      lump("b", "2027-01-01"),
      lump("c", "2028-01-01")
    ];
    expect(validateEventDates(loan.startDate, events)).toEqual([
      null,
      null,
      null
    ]);
  });

  it("flags an event dated before the previous one", () => {
    const events = [lump("a", "2028-01-01"), lump("b", "2027-01-01")];
    const errors = validateEventDates(loan.startDate, events);
    expect(errors[0]).toBeNull();
    expect(errors[1]).toMatch(/before the previous event/);
  });

  it("flags an event dated before the loan start", () => {
    const errors = validateEventDates(loan.startDate, [
      lump("a", "2025-01-01")
    ]);
    expect(errors[0]).toMatch(/before the loan start date/);
  });

  it("flags invalid dates", () => {
    const errors = validateEventDates(loan.startDate, [
      lump("a", "2027-02-30")
    ]);
    expect(errors[0]).toMatch(/valid date/);
  });
});
