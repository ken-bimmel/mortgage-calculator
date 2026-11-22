/**
 * The loan calculation engine (requirements section 7).
 *
 * The loan is walked payment by payment. Events are applied at their dates,
 * each one starting a new period. At every period start a snapshot is taken,
 * including a projection of the rest of the loan with no further events.
 */
import {
  isoToDay,
  monthIndex,
  nextFirstOfMonthAfter,
  nthFirstOfMonthAfter
} from "./dates";
import { periodicPayment } from "./loanCalc";

import {
  type LoanDefinition,
  PAYMENTS_PER_YEAR,
  type PaymentFrequency,
  type TimelineEvent
} from "../types";

/** Balances below this are treated as paid off (avoids float dust). */
const EPSILON = 1e-6;
/** Guard against loans that never pay off. */
const MAX_PAYMENTS = 10_000;
/** Payments in one accelerated bi-weekly year. */
const ACCELERATED_YEAR = 26;
/** Payments in half an accelerated bi-weekly year. */
const ACCELERATED_HALF_YEAR = 13;

const INTERVAL_DAYS: Record<Exclude<PaymentFrequency, "monthly">, number> = {
  biweekly: 14,
  acceleratedBiweekly: 14,
  weekly: 7
};

export class NonTerminatingLoanError extends Error {
  constructor() {
    super("The loan is never paid off with these values.");
    this.name = "NonTerminatingLoanError";
  }
}

export interface Totals {
  /** Regular (scheduled) payment amounts paid. */
  regularPayments: number;
  /** Extra regular payment amounts paid. */
  extraPayments: number;
  /** Lump sums and recast principal payments. */
  lumpSums: number;
  /** Recast fees and closing costs paid out of pocket. */
  fees: number;
  interest: number;
  principal: number;
}

export const totalCost = (totals: Totals): number =>
  totals.regularPayments + totals.extraPayments + totals.lumpSums + totals.fees;

export interface LoanState {
  balance: number;
  annualRate: number;
  frequency: PaymentFrequency;
  /** The regular per-payment amount at the current frequency. */
  payment: number;
  /** Extra amount added to every payment. */
  extra: number;
  /** The term (months) the current payment was calculated for. */
  termMonths: number;
  /** Day of the last scheduled payment of the current term. */
  maturityDay: number;
  lastPaymentDay: number | null;
  nextPaymentDay: number;
  /** Position within the current accelerated bi-weekly year (0-25). */
  acceleratedPosition: number;
  paidOff: boolean;
  payoffDay: number | null;
  paymentCount: number;
  /** Duration covered by the payments made, in months (12 / payments per year each). */
  elapsedMonths: number;
  totals: Totals;
}

export interface PaymentRecord {
  day: number;
  amount: number;
  interest: number;
  principal: number;
  balance: number;
  principalOnly: boolean;
}

/** The loan at a point in time, with its projection to payoff (7.5). */
export interface PointResult {
  day: number;
  frequency: PaymentFrequency;
  payment: number;
  extra: number;
  balance: number;
  paidOff: boolean;
  /** Projected date of the final payment. */
  payoffDay: number;
  /** Projected time until payoff, in months. */
  remainingMonths: number;
  /** Recorded costs so far plus projected costs from this point. */
  totalCost: number;
  totalInterest: number;
}

export interface FinalResult {
  totalCost: number;
  totalInterest: number;
  payoffDay: number;
  /** Total time from the loan start to payoff, in months. */
  totalMonths: number;
  totals: Totals;
}

export type EventStatus =
  | { kind: "applied" }
  | { kind: "afterPayoff" }
  | { kind: "invalid"; field: string; message: string };

export interface SimulationResult {
  /** points[0] is the loan origination; points[i + 1] follows events[i]. */
  points: PointResult[];
  eventStatus: EventStatus[];
  final: FinalResult;
  schedule: PaymentRecord[];
}

/**
 * The next payment date (7.7). The first payment is the first 1st strictly
 * after the reference date; monthly payments are on the 1st, bi-weekly and
 * weekly payments follow every 14 or 7 days from the previous payment.
 */
export const nextPaymentDay = (
  frequency: PaymentFrequency,
  previousDay: number | null,
  afterDay: number
): number => {
  if (frequency === "monthly" || previousDay === null) {
    return nextFirstOfMonthAfter(Math.max(afterDay, previousDay ?? afterDay));
  }
  const interval = INTERVAL_DAYS[frequency];
  let day = previousDay + interval;
  if (day <= afterDay) {
    day += Math.ceil((afterDay - day + 1) / interval) * interval;
  }
  return day;
};

/** Number of scheduled payments from `firstDay` through `lastDay`, inclusive. */
export const countPaymentsThrough = (
  frequency: PaymentFrequency,
  firstDay: number,
  lastDay: number
): number => {
  if (firstDay > lastDay) return 0;
  if (frequency === "monthly") {
    return monthIndex(lastDay) - monthIndex(firstDay) + 1;
  }
  return Math.floor((lastDay - firstDay) / INTERVAL_DAYS[frequency]) + 1;
};

const periodicRate = (state: LoanState): number =>
  state.annualRate / PAYMENTS_PER_YEAR[state.frequency];

/**
 * The regular payment for the current balance, rate and remaining term.
 * Accelerated bi-weekly pays half the monthly payment (6.5).
 */
export const calculatePayment = (state: LoanState, fromDay: number): number => {
  if (state.frequency === "acceleratedBiweekly") {
    const months = countPaymentsThrough(
      "monthly",
      nextFirstOfMonthAfter(fromDay),
      state.maturityDay
    );
    return periodicPayment(state.balance, state.annualRate / 12, months) / 2;
  }
  const payments = countPaymentsThrough(
    state.frequency,
    state.nextPaymentDay,
    state.maturityDay
  );
  return periodicPayment(state.balance, periodicRate(state), payments);
};

const emptyTotals = (): Totals => ({
  regularPayments: 0,
  extraPayments: 0,
  lumpSums: 0,
  fees: 0,
  interest: 0,
  principal: 0
});

export const cloneState = (state: LoanState): LoanState => ({
  ...state,
  totals: { ...state.totals }
});

/** The state of the loan at origination. Requires a valid start date. */
export const initialState = (loan: LoanDefinition): LoanState => {
  const startDay = isoToDay(loan.startDate);
  const balance = loan.purchasePrice - loan.downPayment;
  const termMonths = Math.max(0, Math.round(loan.termMonths));
  const paidOff = !(balance > EPSILON);
  const state: LoanState = {
    balance: paidOff ? 0 : balance,
    annualRate: loan.interestRate,
    frequency: loan.paymentFrequency,
    payment: 0,
    extra: 0,
    termMonths,
    maturityDay: nthFirstOfMonthAfter(startDay, termMonths),
    lastPaymentDay: null,
    nextPaymentDay: nextPaymentDay(loan.paymentFrequency, null, startDay),
    acceleratedPosition: 0,
    paidOff,
    payoffDay: paidOff ? startDay : null,
    paymentCount: 0,
    elapsedMonths: 0,
    totals: emptyTotals()
  };
  if (!paidOff) state.payment = calculatePayment(state, startDay);
  return state;
};

/**
 * Walks payments in order, mutating `state`, until the loan is paid off or
 * the next payment falls after `limitDay` (payments on `limitDay` are made).
 * @param endsRun Whether an accelerated bi-weekly run ends at `limitDay`
 *   (a change of payment frequency), making the last year a partial one.
 */
export const walkPayments = (
  state: LoanState,
  limitDay: number | null,
  endsRun = false,
  // eslint-disable-next-line no-unused-vars
  onPayment?: (record: PaymentRecord) => void
): void => {
  const accelerated = state.frequency === "acceleratedBiweekly";
  let remainingInRun =
    accelerated && endsRun && limitDay !== null
      ? countPaymentsThrough(state.frequency, state.nextPaymentDay, limitDay)
      : Infinity;

  while (
    !state.paidOff &&
    (limitDay === null || state.nextPaymentDay <= limitDay)
  ) {
    if (state.paymentCount >= MAX_PAYMENTS) throw new NonTerminatingLoanError();

    const day = state.nextPaymentDay;
    const scheduled = state.payment;
    const extra = state.extra;
    const due = scheduled + extra;

    // Accelerated bi-weekly principal-only payments (6.5): the last two of a
    // full year, or the last of a partial year of 13 payments or more.
    let principalOnly = false;
    let lastOfPartialYearIfFinal = false;
    if (accelerated) {
      const position = state.acceleratedPosition;
      if (position >= ACCELERATED_YEAR - 2) {
        principalOnly = true;
      } else if (position + 1 >= ACCELERATED_HALF_YEAR) {
        if (remainingInRun === 1) principalOnly = true;
        else lastOfPartialYearIfFinal = true;
      }
    }
    if (lastOfPartialYearIfFinal && state.balance <= due + EPSILON) {
      principalOnly = true;
    }

    const interest = principalOnly ? 0 : state.balance * periodicRate(state);
    const payoffAmount = state.balance + interest;
    const isFinal = payoffAmount <= due + EPSILON;

    let regularPart = scheduled;
    let extraPart = extra;
    if (isFinal) {
      // The final payment is adjusted to the payoff amount (7.8), and any
      // extra is limited to what remains (6.3).
      regularPart = Math.min(scheduled, payoffAmount);
      extraPart = payoffAmount - regularPart;
    }
    const principal = regularPart + extraPart - interest;

    state.balance = isFinal ? 0 : state.balance - principal;
    state.totals.regularPayments += regularPart;
    state.totals.extraPayments += extraPart;
    state.totals.interest += interest;
    state.totals.principal += principal;
    state.paymentCount += 1;
    state.elapsedMonths += 12 / PAYMENTS_PER_YEAR[state.frequency];
    if (accelerated) {
      state.acceleratedPosition =
        (state.acceleratedPosition + 1) % ACCELERATED_YEAR;
    }
    state.lastPaymentDay = day;
    state.nextPaymentDay = nextPaymentDay(state.frequency, day, day);
    remainingInRun -= 1;

    onPayment?.({
      day,
      amount: regularPart + extraPart,
      interest,
      principal,
      balance: state.balance,
      principalOnly
    });

    if (isFinal) {
      state.paidOff = true;
      state.payoffDay = day;
    }
  }
};

/** Marks the loan paid off if no balance remains; returns whether it is. */
const markPaidOffIfZero = (state: LoanState, day: number): boolean => {
  if (state.balance > EPSILON) return false;
  state.balance = 0;
  state.paidOff = true;
  state.payoffDay = day;
  return true;
};

const invalid = (field: string, message: string): EventStatus => ({
  kind: "invalid",
  field,
  message
});

const notNegative = (
  fields: Record<string, number | null>
): EventStatus | null => {
  for (const [field, value] of Object.entries(fields)) {
    if (value !== null && value < 0) {
      return invalid(field, "Must not be negative.");
    }
  }
  return null;
};

const notGreaterThanBalance = (
  field: string,
  amount: number,
  state: LoanState
): EventStatus | null =>
  amount > state.balance + EPSILON
    ? invalid(
        field,
        `Must not be greater than the remaining balance (${state.balance.toFixed(2)}).`
      )
    : null;

/**
 * Applies an event to the state at its date (section 6). Events that are
 * invalid or after payoff leave the state unchanged.
 */
export const applyEvent = (
  state: LoanState,
  event: TimelineEvent,
  loan: LoanDefinition
): EventStatus => {
  if (state.paidOff) return { kind: "afterPayoff" };
  const day = isoToDay(event.date);

  switch (event.type) {
    case "lumpSum": {
      const amount = event.amount ?? 0;
      const error =
        notNegative({ amount: event.amount }) ??
        notGreaterThanBalance("amount", amount, state);
      if (error) return error;
      state.balance -= amount;
      state.totals.lumpSums += amount;
      state.totals.principal += amount;
      markPaidOffIfZero(state, day);
      return { kind: "applied" };
    }
    case "extraPayment": {
      const amount = event.amount ?? 0;
      const error =
        notNegative({ amount: event.amount }) ??
        notGreaterThanBalance("amount", amount, state);
      if (error) return error;
      state.extra = amount;
      return { kind: "applied" };
    }
    case "recast": {
      const principalPayment = event.principalPayment ?? 0;
      const error =
        notNegative({
          principalPayment: event.principalPayment,
          recastFee: event.recastFee,
          newTermMonths: event.newTermMonths
        }) ??
        notGreaterThanBalance("principalPayment", principalPayment, state);
      if (error) return error;
      state.balance -= principalPayment;
      state.totals.lumpSums += principalPayment;
      state.totals.principal += principalPayment;
      state.totals.fees += event.recastFee ?? 0;
      if (!markPaidOffIfZero(state, day)) {
        state.termMonths = Math.round(event.newTermMonths ?? loan.termMonths);
        state.maturityDay = nthFirstOfMonthAfter(day, state.termMonths);
        state.payment = calculatePayment(state, day);
      }
      return { kind: "applied" };
    }
    case "refinance": {
      const error = notNegative({
        newInterestRate: event.newInterestRate,
        newTermMonths: event.newTermMonths,
        closingCosts: event.closingCosts,
        cashOutAmount: event.cashOutAmount
      });
      if (error) return error;
      const closingCosts = event.closingCosts ?? 0;
      state.balance +=
        (event.cashOutAmount ?? 0) +
        (event.rollCostsIntoPrincipal ? closingCosts : 0);
      if (!event.rollCostsIntoPrincipal) state.totals.fees += closingCosts;
      state.annualRate = event.newInterestRate ?? 0;
      state.termMonths = Math.round(event.newTermMonths ?? loan.termMonths);
      state.maturityDay = nthFirstOfMonthAfter(day, state.termMonths);
      if (!markPaidOffIfZero(state, day))
        state.payment = calculatePayment(state, day);
      return { kind: "applied" };
    }
    case "paymentFrequency": {
      if (event.paymentFrequency === state.frequency)
        return { kind: "applied" };
      state.frequency = event.paymentFrequency;
      state.nextPaymentDay = nextPaymentDay(
        state.frequency,
        state.lastPaymentDay,
        day
      );
      state.acceleratedPosition = 0;
      state.payment = calculatePayment(state, day);
      return { kind: "applied" };
    }
  }
};

/** Snapshot of the state at `day`, with a projection to payoff. */
const snapshot = (state: LoanState, day: number): PointResult => {
  const projection = cloneState(state);
  walkPayments(projection, null);
  return {
    day,
    frequency: state.frequency,
    payment: state.paidOff ? 0 : state.payment,
    extra: state.paidOff ? 0 : state.extra,
    balance: state.balance,
    paidOff: state.paidOff,
    payoffDay: projection.payoffDay ?? day,
    remainingMonths: projection.elapsedMonths - state.elapsedMonths,
    totalCost: totalCost(projection.totals),
    totalInterest: projection.totals.interest
  };
};

/**
 * Runs the loan with its events to payoff. Events must be in chronological
 * order with valid dates, and the loan must have a valid start date.
 * @throws NonTerminatingLoanError if the loan never pays off
 */
export const simulate = (
  loan: LoanDefinition,
  events: readonly TimelineEvent[]
): SimulationResult => {
  const schedule: PaymentRecord[] = [];
  const record = (payment: PaymentRecord) => {
    schedule.push(payment);
  };
  const state = initialState(loan);
  const points: PointResult[] = [snapshot(state, isoToDay(loan.startDate))];
  const eventStatus: EventStatus[] = [];

  for (const event of events) {
    const day = isoToDay(event.date);
    const endsRun =
      event.type === "paymentFrequency" &&
      event.paymentFrequency !== state.frequency;
    walkPayments(state, day, endsRun, record);
    eventStatus.push(applyEvent(state, event, loan));
    points.push(snapshot(state, day));
  }

  walkPayments(state, null, false, record);

  return {
    points,
    eventStatus,
    schedule,
    final: {
      totalCost: totalCost(state.totals),
      totalInterest: state.totals.interest,
      payoffDay: state.payoffDay ?? isoToDay(loan.startDate),
      totalMonths: state.elapsedMonths,
      totals: state.totals
    }
  };
};

/** The balance after the most recent payment on or before `day`. */
export const balanceAt = (
  result: SimulationResult,
  loan: LoanDefinition,
  day: number
): number => {
  const { schedule } = result;
  let low = 0;
  let high = schedule.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (schedule[mid].day <= day) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  if (found === -1) return Math.max(0, loan.purchasePrice - loan.downPayment);
  return schedule[found].balance;
};
