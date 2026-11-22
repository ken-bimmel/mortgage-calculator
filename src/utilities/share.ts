/**
 * Shareable links (requirements 2.2): the app state is serialized to JSON,
 * base64 encoded, and stored in the `s` query parameter. Invalid data in a
 * loaded link is ignored.
 */
import { v4 as uuid } from "uuid";

import { isValidIsoDate, todayIso } from "./dates";

import {
  type AppState,
  EVENT_TYPES,
  type EventType,
  type LoanDefinition,
  PAYMENT_FREQUENCIES,
  type PaymentFrequency,
  type TimelineEvent
} from "../types";

export const SHARE_PARAM = "s";

export const defaultLoan = (
  startDate: string = todayIso()
): LoanDefinition => ({
  purchasePrice: 500_000,
  downPayment: 100_000,
  downPaymentPercent: 0.2,
  interestRate: 0.05,
  termMonths: 360,
  startDate,
  paymentFrequency: "monthly"
});

export const defaultState = (): AppState => ({
  loan: defaultLoan(),
  events: []
});

/** Base64 of the UTF-8 bytes of `text`. */
const toBase64 = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const fromBase64 = (encoded: string): string => {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
};

/** The serialized form of the state: events without their in-memory ids. */
export const serializeState = (state: AppState): string =>
  JSON.stringify({
    loan: state.loan,
    // A fixed key order keeps re-encoded links identical
    events: state.events.map((event) => ({
      type: event.type,
      date: event.date,
      ...Object.fromEntries(
        Object.entries(event).filter(([key]) => key !== "id")
      )
    }))
  });

export const encodeState = (state: AppState): string =>
  toBase64(serializeState(state));

type Record_ = Record<string, unknown>;

const isRecord = (value: unknown): value is Record_ =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isFrequency = (value: unknown): value is PaymentFrequency =>
  PAYMENT_FREQUENCIES.includes(value as PaymentFrequency);

const isEventType = (value: unknown): value is EventType =>
  EVENT_TYPES.includes(value as EventType);

/** A non-negative amount, or null when missing or invalid. */
const amount = (value: unknown): number | null =>
  isFiniteNumber(value) && value >= 0 ? value : null;

const sanitizeLoan = (value: unknown): LoanDefinition => {
  const defaults = defaultLoan();
  if (!isRecord(value)) return defaults;
  const number = (key: keyof LoanDefinition): number => {
    const field = value[key];
    return isFiniteNumber(field) ? field : (defaults[key] as number);
  };
  return {
    purchasePrice: number("purchasePrice"),
    downPayment: number("downPayment"),
    downPaymentPercent: number("downPaymentPercent"),
    interestRate: number("interestRate"),
    termMonths: number("termMonths"),
    startDate:
      typeof value.startDate === "string" && isValidIsoDate(value.startDate)
        ? value.startDate
        : defaults.startDate,
    paymentFrequency: isFrequency(value.paymentFrequency)
      ? value.paymentFrequency
      : defaults.paymentFrequency
  };
};

/** Returns a valid event, or null if the event cannot be used. */
const sanitizeEvent = (
  value: unknown,
  loan: LoanDefinition
): TimelineEvent | null => {
  if (!isRecord(value) || !isEventType(value.type)) return null;
  if (typeof value.date !== "string" || !isValidIsoDate(value.date)) {
    return null;
  }
  const base = { id: uuid(), date: value.date };
  const term = amount(value.newTermMonths) ?? loan.termMonths;
  switch (value.type) {
    case "recast":
      return {
        ...base,
        type: "recast",
        principalPayment: amount(value.principalPayment),
        recastFee: amount(value.recastFee),
        newTermMonths: term
      };
    case "lumpSum":
      return { ...base, type: "lumpSum", amount: amount(value.amount) };
    case "extraPayment":
      return { ...base, type: "extraPayment", amount: amount(value.amount) };
    case "refinance":
      return {
        ...base,
        type: "refinance",
        newInterestRate: amount(value.newInterestRate),
        newTermMonths: term,
        closingCosts: amount(value.closingCosts),
        rollCostsIntoPrincipal: value.rollCostsIntoPrincipal === true,
        cashOutAmount: amount(value.cashOutAmount)
      };
    case "paymentFrequency":
      return isFrequency(value.paymentFrequency)
        ? {
            ...base,
            type: "paymentFrequency",
            paymentFrequency: value.paymentFrequency
          }
        : null;
  }
};

/** Builds a valid state from untrusted data, dropping what is invalid. */
export const sanitizeState = (value: unknown): AppState => {
  const loan = sanitizeLoan(isRecord(value) ? value.loan : undefined);
  const rawEvents =
    isRecord(value) && Array.isArray(value.events) ? value.events : [];
  const events = rawEvents
    .map((event) => sanitizeEvent(event, loan))
    .filter((event): event is TimelineEvent => event !== null);
  return { loan, events };
};

/** Decodes a shared state. Returns null if nothing usable can be read. */
export const decodeState = (encoded: string): AppState | null => {
  try {
    // "+" may arrive as a space if the link was not percent-encoded.
    const parsed: unknown = JSON.parse(fromBase64(encoded.replace(/ /g, "+")));
    if (!isRecord(parsed)) return null;
    return sanitizeState(parsed);
  } catch {
    return null;
  }
};

/** The shareable link for a state, based on the current page URL. */
export const buildShareUrl = (state: AppState, pageUrl: string): string => {
  const url = new URL(pageUrl);
  url.hash = "";
  url.searchParams.set(SHARE_PARAM, encodeState(state));
  return url.toString();
};

/**
 * Reads the state from a page URL. Returns the state to start with and the
 * URL the address bar should show: invalid data is removed from it.
 */
export const loadFromUrl = (
  pageUrl: string
): { state: AppState; url: string } => {
  const url = new URL(pageUrl);
  const encoded = url.searchParams.get(SHARE_PARAM);
  if (encoded === null) return { state: defaultState(), url: url.toString() };

  const state = decodeState(encoded);
  if (state === null) {
    url.searchParams.delete(SHARE_PARAM);
    return { state: defaultState(), url: url.toString() };
  }
  url.searchParams.set(SHARE_PARAM, encodeState(state));
  return { state, url: url.toString() };
};
