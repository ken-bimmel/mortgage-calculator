export const PAYMENT_FREQUENCIES = [
  "monthly",
  "biweekly",
  "acceleratedBiweekly",
  "weekly"
] as const;

export type PaymentFrequency = (typeof PAYMENT_FREQUENCIES)[number];

/** Number of payments per year for each frequency (requirements 7.3). */
export const PAYMENTS_PER_YEAR: Record<PaymentFrequency, number> = {
  monthly: 12,
  biweekly: 26,
  acceleratedBiweekly: 26,
  weekly: 52
};

/**
 * The initial loan. Rates and percentages are stored as decimals
 * (0.05 for 5%). Dates are ISO strings (YYYY-MM-DD).
 */
export interface LoanDefinition {
  purchasePrice: number;
  downPayment: number;
  downPaymentPercent: number;
  interestRate: number;
  termMonths: number;
  startDate: string;
  paymentFrequency: PaymentFrequency;
}

interface EventBase {
  /** In-memory identifier; not part of the shared link. */
  id: string;
  /** ISO date (YYYY-MM-DD). May be an incomplete or invalid string while the user types. */
  date: string;
}

export interface RecastEvent extends EventBase {
  type: "recast";
  principalPayment: number | null;
  recastFee: number | null;
  newTermMonths: number | null;
}

export interface LumpSumEvent extends EventBase {
  type: "lumpSum";
  amount: number | null;
}

export interface ExtraPaymentEvent extends EventBase {
  type: "extraPayment";
  amount: number | null;
}

export interface RefinanceEvent extends EventBase {
  type: "refinance";
  newInterestRate: number | null;
  newTermMonths: number | null;
  closingCosts: number | null;
  rollCostsIntoPrincipal: boolean;
  cashOutAmount: number | null;
}

export interface PaymentFrequencyEvent extends EventBase {
  type: "paymentFrequency";
  paymentFrequency: PaymentFrequency;
}

export type TimelineEvent =
  | RecastEvent
  | LumpSumEvent
  | ExtraPaymentEvent
  | RefinanceEvent
  | PaymentFrequencyEvent;

export type EventType = TimelineEvent["type"];

/** Order in which event types are offered (requirements 5.3). */
export const EVENT_TYPES: readonly EventType[] = [
  "recast",
  "lumpSum",
  "extraPayment",
  "refinance",
  "paymentFrequency"
];

export interface AppState {
  loan: LoanDefinition;
  events: TimelineEvent[];
}
