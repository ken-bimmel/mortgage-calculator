import { describe, expect, it } from "vitest";

import {
  amortizedLoanPaymentAmount,
  amortizedLoanTotalAmount,
  paymentsToPayoff,
  periodicPayment
} from "./loanCalc";

describe("periodicPayment", () => {
  it("matches the standard amortization formula", () => {
    // $400,000 at 5% over 30 years: well-known $2,147.29 monthly payment
    expect(periodicPayment(400_000, 0.05 / 12, 360)).toBeCloseTo(2147.29, 2);
  });

  it("splits the balance evenly at a zero rate", () => {
    expect(periodicPayment(12_000, 0, 12)).toBe(1000);
  });

  it("is due in full when no payments remain", () => {
    expect(periodicPayment(1000, 0.01, 0)).toBeCloseTo(1010);
  });
});

describe("amortizedLoanPaymentAmount", () => {
  it("takes the annual rate as a decimal", () => {
    expect(amortizedLoanPaymentAmount(100_000, 0.06, 360)).toBeCloseTo(
      599.55,
      2
    );
  });
});

describe("paymentsToPayoff", () => {
  it("equals the term when paying the regular payment", () => {
    const r = 0.05 / 12;
    const p = periodicPayment(400_000, r, 360);
    expect(paymentsToPayoff(400_000, r, p)).toBeCloseTo(360, 6);
  });

  it("is shorter with an extra amount", () => {
    const r = 0.05 / 12;
    const p = periodicPayment(400_000, r, 360);
    expect(paymentsToPayoff(400_000, r, p, 500)).toBeLessThan(360);
  });

  it("is infinite when the payment does not cover interest", () => {
    expect(paymentsToPayoff(100_000, 0.01, 1000)).toBe(Infinity);
  });

  it("is zero for a paid-off balance", () => {
    expect(paymentsToPayoff(0, 0.01, 100)).toBe(0);
  });
});

describe("amortizedLoanTotalAmount", () => {
  it("computes total and interest, including fees in the total", () => {
    const r = 0.05 / 12;
    const { total, interest } = amortizedLoanTotalAmount(400_000, r, 360, 100);
    const payment = periodicPayment(400_000, r, 360);
    expect(total).toBeCloseTo(payment * 360 + 100, 6);
    expect(interest).toBeCloseTo(payment * 360 - 400_000, 6);
  });
});
