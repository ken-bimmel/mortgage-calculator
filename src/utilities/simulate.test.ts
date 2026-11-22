import { describe, expect, it } from "vitest";

import { calculate } from "./calculate";
import { dayToIso, isoToDay } from "./dates";
import { periodicPayment } from "./loanCalc";
import { defaultLoan } from "./share";
import {
  type PaymentRecord,
  balanceAt,
  countPaymentsThrough,
  nextPaymentDay,
  simulate
} from "./simulate";

import type { LoanDefinition, TimelineEvent } from "../types";

const loan: LoanDefinition = defaultLoan("2026-11-21");
const MONTHLY = periodicPayment(400_000, 0.05 / 12, 360);

const iso = (day: number) => dayToIso(day);
const lastPayment = (schedule: PaymentRecord[]) =>
  schedule[schedule.length - 1];

describe("payment schedule", () => {
  it("makes the first payment on the first 1st after the start", () => {
    const day = nextPaymentDay("monthly", null, isoToDay("2026-11-21"));
    expect(iso(day)).toBe("2026-12-01");
    const weekly = nextPaymentDay("weekly", null, isoToDay("2026-11-01"));
    expect(iso(weekly)).toBe("2026-12-01");
  });

  it("continues bi-weekly and weekly at fixed intervals", () => {
    const first = isoToDay("2026-12-01");
    expect(iso(nextPaymentDay("biweekly", first, first))).toBe("2026-12-15");
    expect(iso(nextPaymentDay("weekly", first, first))).toBe("2026-12-08");
    // After an event, the next payment is strictly after the event date
    expect(iso(nextPaymentDay("weekly", first, isoToDay("2026-12-20")))).toBe(
      "2026-12-22"
    );
  });

  it("counts payments through a date", () => {
    const first = isoToDay("2026-12-01");
    expect(countPaymentsThrough("monthly", first, isoToDay("2056-11-01"))).toBe(
      360
    );
    expect(countPaymentsThrough("weekly", first, first + 13)).toBe(2);
    expect(countPaymentsThrough("weekly", first, first - 1)).toBe(0);
  });
});

describe("baseline loan", () => {
  const result = simulate(loan, []);

  it("pays the standard monthly payment for the full term", () => {
    expect(result.points[0].payment).toBeCloseTo(MONTHLY, 6);
    expect(result.schedule).toHaveLength(360);
    expect(iso(result.final.payoffDay)).toBe("2056-11-01");
    expect(result.final.totalMonths).toBeCloseTo(360, 6);
  });

  it("ends with exactly a zero balance", () => {
    expect(lastPayment(result.schedule).balance).toBe(0);
    expect(result.final.totals.principal).toBeCloseTo(400_000, 4);
  });

  it("totals cost and interest", () => {
    expect(result.final.totalCost).toBeCloseTo(MONTHLY * 360, 2);
    expect(result.final.totalInterest).toBeCloseTo(MONTHLY * 360 - 400_000, 2);
    expect(result.points[0].totalCost).toBeCloseTo(result.final.totalCost, 6);
  });

  it("computes interest as balance times the periodic rate", () => {
    expect(result.schedule[0].interest).toBeCloseTo(400_000 * (0.05 / 12), 6);
  });

  it("reports the balance at a point in time", () => {
    expect(balanceAt(result, loan, isoToDay("2026-11-30"))).toBe(400_000);
    expect(balanceAt(result, loan, isoToDay("2026-12-15"))).toBeCloseTo(
      result.schedule[0].balance,
      6
    );
  });

  it("handles a zero interest rate", () => {
    const zero = simulate({ ...loan, interestRate: 0 }, []);
    expect(zero.points[0].payment).toBeCloseTo(400_000 / 360, 6);
    expect(zero.final.totalInterest).toBe(0);
  });

  it("handles a fully paid property", () => {
    const paid = simulate({ ...loan, downPayment: 500_000 }, []);
    expect(paid.final.totalCost).toBe(0);
    expect(paid.schedule).toHaveLength(0);
  });
});

type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;
const event = (e: WithoutId<TimelineEvent>): TimelineEvent => ({
  id: Math.random().toString(),
  ...e
});

describe("lump sum payment", () => {
  const result = simulate(loan, [
    event({ type: "lumpSum", date: "2031-06-15", amount: 50_000 })
  ]);

  it("reduces the balance without changing the payment", () => {
    const before = result.points[0];
    const after = result.points[1];
    expect(after.payment).toBeCloseTo(before.payment, 6);
    expect(after.balance).toBeCloseTo(
      balanceAt(simulate(loan, []), loan, isoToDay("2031-06-15")) - 50_000,
      6
    );
  });

  it("pays the loan off sooner with less interest", () => {
    const baseline = simulate(loan, []);
    expect(result.final.payoffDay).toBeLessThan(baseline.final.payoffDay);
    expect(result.final.totalInterest).toBeLessThan(
      baseline.final.totalInterest
    );
    expect(result.final.totals.lumpSums).toBe(50_000);
  });

  it("is invalid when greater than the remaining balance", () => {
    const invalid = simulate(loan, [
      event({ type: "lumpSum", date: "2027-01-15", amount: 500_000 })
    ]);
    expect(invalid.eventStatus[0]).toMatchObject({
      kind: "invalid",
      field: "amount"
    });
    expect(invalid.final.totalCost).toBeCloseTo(
      simulate(loan, []).final.totalCost,
      6
    );
  });

  it("can pay off the whole loan", () => {
    const payoff = simulate(loan, [
      event({ type: "lumpSum", date: "2026-11-25", amount: 400_000 })
    ]);
    expect(payoff.eventStatus[0].kind).toBe("applied");
    expect(iso(payoff.final.payoffDay)).toBe("2026-11-25");
    expect(payoff.final.totalCost).toBe(400_000);
  });
});

describe("events after payoff", () => {
  it("are marked and ignored", () => {
    const result = simulate(loan, [
      event({ type: "lumpSum", date: "2057-01-01", amount: 1000 }),
      event({
        type: "recast",
        date: "2058-01-01",
        principalPayment: 1,
        recastFee: 100,
        newTermMonths: 360
      })
    ]);
    expect(result.eventStatus.map((s) => s.kind)).toEqual([
      "afterPayoff",
      "afterPayoff"
    ]);
    expect(result.final.totalCost).toBeCloseTo(
      simulate(loan, []).final.totalCost,
      6
    );
  });
});

describe("recast", () => {
  const result = simulate(loan, [
    event({
      type: "recast",
      date: "2031-06-15",
      principalPayment: 50_000,
      recastFee: 250,
      newTermMonths: 120
    })
  ]);

  it("re-amortizes the remaining balance over the new term", () => {
    const after = result.points[1];
    expect(after.payment).toBeCloseTo(
      periodicPayment(after.balance, 0.05 / 12, 120),
      6
    );
    // The new term is counted from the event date
    expect(iso(result.final.payoffDay)).toBe("2041-06-01");
  });

  it("adds the fee to the cost but not the balance", () => {
    expect(result.final.totals.fees).toBe(250);
    expect(result.final.totals.principal).toBeCloseTo(400_000, 4);
    expect(result.final.totalCost).toBeCloseTo(
      result.final.totals.regularPayments + 50_000 + 250,
      6
    );
  });

  it("is invalid when the principal payment exceeds the balance", () => {
    const invalid = simulate(loan, [
      event({
        type: "recast",
        date: "2031-06-15",
        principalPayment: 1_000_000,
        recastFee: 0,
        newTermMonths: 360
      })
    ]);
    expect(invalid.eventStatus[0]).toMatchObject({
      kind: "invalid",
      field: "principalPayment"
    });
  });
});

describe("extra regular payment", () => {
  const baseline = simulate(loan, []);
  const result = simulate(loan, [
    event({ type: "extraPayment", date: "2027-01-15", amount: 500 })
  ]);

  it("adds the extra to every payment without recalculating it", () => {
    expect(result.points[1].payment).toBeCloseTo(MONTHLY, 6);
    const payment = result.schedule.find((p) => p.day > isoToDay("2027-01-15"));
    expect(payment?.amount).toBeCloseTo(MONTHLY + 500, 6);
  });

  it("pays off sooner with less interest", () => {
    expect(result.final.payoffDay).toBeLessThan(baseline.final.payoffDay);
    expect(result.final.totalInterest).toBeLessThan(
      baseline.final.totalInterest
    );
    expect(lastPayment(result.schedule).balance).toBe(0);
  });

  it("limits the final payment to the payoff amount", () => {
    const last = lastPayment(result.schedule);
    expect(last.amount).toBeLessThanOrEqual(MONTHLY + 500 + 1e-6);
    expect(result.final.totals.principal).toBeCloseTo(400_000, 4);
  });

  it("stops with a later event of 0 and is replaced by a later amount", () => {
    const stopped = simulate(loan, [
      event({ type: "extraPayment", date: "2027-01-15", amount: 500 }),
      event({ type: "extraPayment", date: "2028-01-15", amount: 0 })
    ]);
    expect(stopped.points[2].extra).toBe(0);
    expect(stopped.final.payoffDay).toBeGreaterThan(result.final.payoffDay);
    expect(stopped.final.payoffDay).toBeLessThanOrEqual(
      baseline.final.payoffDay
    );
  });

  it("follows a later change of payment frequency", () => {
    const weekly = simulate(loan, [
      event({ type: "extraPayment", date: "2027-01-15", amount: 100 }),
      event({
        type: "paymentFrequency",
        date: "2028-01-15",
        paymentFrequency: "weekly"
      })
    ]);
    const payments = weekly.schedule.filter(
      (p) => p.day > isoToDay("2028-01-15")
    );
    expect(payments[1].day - payments[0].day).toBe(7);
    expect(payments[0].amount).toBeCloseTo(weekly.points[2].payment + 100, 6);
  });
});

describe("refinance", () => {
  const date = "2031-06-15";
  const refinance = (overrides: Partial<TimelineEvent> = {}) =>
    simulate(loan, [
      event({
        type: "refinance",
        date,
        newInterestRate: 0.04,
        newTermMonths: 240,
        closingCosts: 5000,
        rollCostsIntoPrincipal: false,
        cashOutAmount: null,
        ...overrides
      } as TimelineEvent)
    ]);

  it("recalculates the payment with the new rate and term", () => {
    const result = refinance();
    const after = result.points[1];
    expect(after.payment).toBeCloseTo(
      periodicPayment(after.balance, 0.04 / 12, 240),
      6
    );
    expect(iso(result.final.payoffDay)).toBe("2051-06-01");
  });

  it("counts closing costs paid out of pocket as a cost", () => {
    const result = refinance();
    expect(result.final.totals.fees).toBe(5000);
    // Not added to the balance
    expect(result.points[1].balance).toBeCloseTo(
      balanceAt(simulate(loan, []), loan, isoToDay(date)),
      6
    );
  });

  it("rolls closing costs and cash-out into the principal", () => {
    const outOfPocket = refinance();
    const rolled = refinance({
      rollCostsIntoPrincipal: true,
      cashOutAmount: 20_000
    });
    expect(rolled.final.totals.fees).toBe(0);
    expect(rolled.points[1].balance).toBeCloseTo(
      outOfPocket.points[1].balance + 25_000,
      6
    );
  });

  it("rejects negative amounts", () => {
    const result = refinance({ closingCosts: -1 });
    expect(result.eventStatus[0]).toMatchObject({
      kind: "invalid",
      field: "closingCosts"
    });
  });
});

describe("change payment frequency", () => {
  const date = "2031-06-15";

  it("keeps the payoff date and recalculates the payment", () => {
    const result = simulate(loan, [
      event({ type: "paymentFrequency", date, paymentFrequency: "biweekly" })
    ]);
    const after = result.points[1];
    expect(after.frequency).toBe("biweekly");
    expect(after.payment).toBeLessThan(MONTHLY / 2 + 1);
    // The last bi-weekly payment falls within two weeks of the original maturity
    const original = isoToDay("2056-11-01");
    expect(original - result.final.payoffDay).toBeGreaterThanOrEqual(0);
    expect(original - result.final.payoffDay).toBeLessThan(14);
    expect(lastPayment(result.schedule).balance).toBe(0);
  });

  it("does nothing when the frequency is unchanged", () => {
    const result = simulate(loan, [
      event({ type: "paymentFrequency", date, paymentFrequency: "monthly" })
    ]);
    expect(result.final.totalCost).toBeCloseTo(
      simulate(loan, []).final.totalCost,
      6
    );
  });
});

describe("accelerated bi-weekly", () => {
  const accelerated = {
    ...loan,
    paymentFrequency: "acceleratedBiweekly" as const
  };
  const result = simulate(accelerated, []);

  it("pays half the monthly payment", () => {
    expect(result.points[0].payment).toBeCloseTo(MONTHLY / 2, 6);
  });

  it("makes the last two payments of each year principal-only", () => {
    const flags = result.schedule.slice(0, 26).map((p) => p.principalOnly);
    expect(flags.slice(0, 24).every((f) => !f)).toBe(true);
    expect(flags.slice(24)).toEqual([true, true]);
    expect(result.schedule[24].interest).toBe(0);
  });

  it("pays off sooner than monthly with less interest", () => {
    const monthly = simulate(loan, []);
    expect(result.final.payoffDay).toBeLessThan(monthly.final.payoffDay);
    expect(result.final.totalInterest).toBeLessThan(
      monthly.final.totalInterest
    );
    expect(lastPayment(result.schedule).balance).toBe(0);
  });

  it("makes the last payment of a partial half year principal-only", () => {
    // 20 accelerated payments, then back to monthly
    const firstDay = isoToDay("2026-12-01");
    const switchDate = dayToIso(firstDay + 14 * 19 + 3);
    const partial = simulate(accelerated, [
      event({
        type: "paymentFrequency",
        date: switchDate,
        paymentFrequency: "monthly"
      })
    ]);
    const run = partial.schedule.filter((p) => p.day <= isoToDay(switchDate));
    expect(run).toHaveLength(20);
    expect(run.map((p) => p.principalOnly).indexOf(true)).toBe(19);
  });

  it("has no principal-only payment in a partial year under half", () => {
    const firstDay = isoToDay("2026-12-01");
    const switchDate = dayToIso(firstDay + 14 * 9 + 3);
    const partial = simulate(accelerated, [
      event({
        type: "paymentFrequency",
        date: switchDate,
        paymentFrequency: "monthly"
      })
    ]);
    const run = partial.schedule.filter((p) => p.day <= isoToDay(switchDate));
    expect(run).toHaveLength(10);
    expect(run.some((p) => p.principalOnly)).toBe(false);
  });

  it("recalculates the half-monthly amount after a recast", () => {
    const recast = simulate(accelerated, [
      event({
        type: "recast",
        date: "2031-06-15",
        principalPayment: 50_000,
        recastFee: 0,
        newTermMonths: 120
      })
    ]);
    const after = recast.points[1];
    expect(after.payment).toBeCloseTo(
      periodicPayment(after.balance, 0.05 / 12, 120) / 2,
      6
    );
  });
});

describe("calculate", () => {
  it("pauses calculations while an event is out of order", () => {
    const result = calculate({
      loan,
      events: [
        event({ type: "lumpSum", date: "2030-01-01", amount: 1 }),
        event({ type: "lumpSum", date: "2029-01-01", amount: 1 })
      ]
    });
    expect(result.status).toBe("paused");
    expect(result.dateErrors[1]).not.toBeNull();
    // The baseline is still available
    expect(result.baseline).not.toBeNull();
  });

  it("calculates the scenario and the baseline", () => {
    const result = calculate({
      loan,
      events: [event({ type: "lumpSum", date: "2030-01-01", amount: 1000 })]
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.scenario.points).toHaveLength(2);
    expect(result.baseline.points).toHaveLength(1);
  });

  it("pauses without a valid loan start date", () => {
    expect(
      calculate({ loan: { ...loan, startDate: "2026-" }, events: [] }).status
    ).toBe("paused");
  });
});
