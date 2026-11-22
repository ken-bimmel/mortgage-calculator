import { describe, expect, it } from "vitest";

import {
  SHARE_PARAM,
  buildShareUrl,
  decodeState,
  defaultLoan,
  encodeState,
  loadFromUrl,
  sanitizeState
} from "./share";

import type { AppState } from "../types";

const state: AppState = {
  loan: defaultLoan("2026-11-21"),
  events: [
    { id: "1", type: "lumpSum", date: "2027-01-01", amount: 1000 },
    {
      id: "2",
      type: "refinance",
      date: "2028-01-01",
      newInterestRate: 0.04,
      newTermMonths: 240,
      closingCosts: 3000,
      rollCostsIntoPrincipal: true,
      cashOutAmount: null
    }
  ]
};

const withoutIds = (s: AppState) => ({
  loan: s.loan,
  events: s.events.map((e) => ({ ...e, id: undefined }))
});
const encode = (value: unknown) => btoa(JSON.stringify(value));

describe("share links", () => {
  it("round-trips the state through base64 JSON", () => {
    const decoded = decodeState(encodeState(state));
    expect(decoded).not.toBeNull();
    expect(withoutIds(decoded!)).toEqual(withoutIds(state));
  });

  it("encodes the JSON representation of the state as base64", () => {
    expect(JSON.parse(atob(encodeState(state)))).toEqual(withoutIds(state));
  });

  it("builds and loads a URL", () => {
    const url = buildShareUrl(state, "https://example.com/app/?x=1#top");
    const loaded = loadFromUrl(url);
    expect(withoutIds(loaded.state)).toEqual(withoutIds(state));
    expect(new URL(loaded.url).searchParams.get("x")).toBe("1");
  });

  it("leaves a valid link unchanged when loaded", () => {
    const url = buildShareUrl(state, "https://example.com/app/");
    expect(loadFromUrl(url).url).toBe(url);
  });

  it("starts blank without a link", () => {
    const loaded = loadFromUrl("https://example.com/app/");
    expect(loaded.state.events).toEqual([]);
    expect(loaded.url).toBe("https://example.com/app/");
  });

  it("removes unreadable data from the URL", () => {
    const loaded = loadFromUrl(
      `https://example.com/?${SHARE_PARAM}=%%%not-base64`
    );
    expect(loaded.state.events).toEqual([]);
    expect(new URL(loaded.url).searchParams.has(SHARE_PARAM)).toBe(false);
  });

  it("ignores invalid events and fields and removes them from the URL", () => {
    const raw = {
      loan: { ...state.loan, interestRate: "high", paymentFrequency: "daily" },
      events: [
        { type: "lumpSum", date: "2027-01-01", amount: 1000 },
        { type: "teleport", date: "2027-01-01" },
        { type: "lumpSum", date: "not a date", amount: 5 },
        { type: "extraPayment", date: "2027-02-01", amount: -5 },
        { type: "paymentFrequency", date: "2027-03-01", paymentFrequency: 3 }
      ]
    };
    const loaded = loadFromUrl(
      `https://example.com/?${SHARE_PARAM}=${encodeURIComponent(encode(raw))}`
    );
    expect(loaded.state.loan.interestRate).toBe(0.05);
    expect(loaded.state.loan.paymentFrequency).toBe("monthly");
    expect(loaded.state.events.map((e) => e.type)).toEqual([
      "lumpSum",
      "extraPayment"
    ]);
    expect(loaded.state.events[1]).toMatchObject({ amount: null });

    const reloaded = decodeState(
      new URL(loaded.url).searchParams.get(SHARE_PARAM)!
    );
    expect(withoutIds(reloaded!)).toEqual(withoutIds(loaded.state));
  });

  it("uses defaults when the loan is missing", () => {
    const sanitized = sanitizeState({ events: "nope" });
    expect(sanitized.loan.purchasePrice).toBe(500_000);
    expect(sanitized.events).toEqual([]);
  });
});
