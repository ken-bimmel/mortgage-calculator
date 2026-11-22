/**
 * Timeline logic: event creation, ordering, positioning and date validation
 * (requirements section 5).
 */
import { v4 as uuid } from "uuid";

import { addDaysIso, isValidIsoDate } from "./dates";

import type {
  EventType,
  LoanDefinition,
  PaymentFrequency,
  TimelineEvent
} from "../types";

export const createEvent = (
  type: EventType,
  date: string,
  context: { termMonths: number; paymentFrequency: PaymentFrequency },
  id: string = uuid()
): TimelineEvent => {
  switch (type) {
    case "recast":
      return {
        id,
        type,
        date,
        principalPayment: null,
        recastFee: null,
        newTermMonths: context.termMonths
      };
    case "lumpSum":
      return { id, type, date, amount: null };
    case "extraPayment":
      return { id, type, date, amount: null };
    case "refinance":
      return {
        id,
        type,
        date,
        newInterestRate: null,
        newTermMonths: context.termMonths,
        closingCosts: null,
        rollCostsIntoPrincipal: false,
        cashOutAmount: null
      };
    case "paymentFrequency":
      return {
        id,
        type,
        date,
        paymentFrequency: context.paymentFrequency
      };
  }
};

/**
 * Default date for an event inserted at `index`: one day after the previous
 * item (the previous event, or the loan start for the first position).
 */
export const defaultDateForInsert = (
  startDate: string,
  events: readonly TimelineEvent[],
  index: number
): string => {
  for (let i = index - 1; i >= 0; i--) {
    if (isValidIsoDate(events[i].date)) return addDaysIso(events[i].date, 1);
  }
  return isValidIsoDate(startDate) ? addDaysIso(startDate, 1) : startDate;
};

/** The payment frequency in effect just before position `index`. */
export const frequencyBefore = (
  loan: LoanDefinition,
  events: readonly TimelineEvent[],
  index: number
): PaymentFrequency => {
  for (let i = Math.min(index, events.length) - 1; i >= 0; i--) {
    const event = events[i];
    if (event.type === "paymentFrequency") return event.paymentFrequency;
  }
  return loan.paymentFrequency;
};

/** Inserts a new event of `type` at `index`, with its default values. */
export const insertEvent = (
  loan: LoanDefinition,
  events: readonly TimelineEvent[],
  index: number,
  type: EventType,
  id?: string
): TimelineEvent[] => {
  const event = createEvent(
    type,
    defaultDateForInsert(loan.startDate, events, index),
    {
      termMonths: loan.termMonths,
      paymentFrequency: frequencyBefore(loan, events, index)
    },
    id
  );
  return [...events.slice(0, index), event, ...events.slice(index)];
};

export const removeEvent = (
  events: readonly TimelineEvent[],
  id: string
): TimelineEvent[] => events.filter((event) => event.id !== id);

export const updateEvent = (
  events: readonly TimelineEvent[],
  updated: TimelineEvent
): TimelineEvent[] =>
  events.map((event) => (event.id === updated.id ? updated : event));

/**
 * Moves the event at `from` to `to` (its index in the resulting array) and
 * changes its date (5.6): moved later, it becomes the day after the event now
 * above it; moved earlier, the day before the event now below it.
 */
export const moveEvent = (
  events: readonly TimelineEvent[],
  from: number,
  to: number
): TimelineEvent[] => {
  if (from === to || from < 0 || from >= events.length) return [...events];
  const target = Math.max(0, Math.min(to, events.length - 1));
  const result = [...events];
  const [moved] = result.splice(from, 1);
  const neighbor = target > from ? result[target - 1] : result[target];
  const offset = target > from ? 1 : -1;
  const date = isValidIsoDate(neighbor.date)
    ? addDaysIso(neighbor.date, offset)
    : moved.date;
  result.splice(target, 0, { ...moved, date });
  return result;
};

/**
 * Date errors for each event (5.5): an invalid date, or a date earlier than
 * the item before it. Same-day events are allowed. `null` means no error.
 */
export const validateEventDates = (
  startDate: string,
  events: readonly TimelineEvent[]
): (string | null)[] => {
  let previous = isValidIsoDate(startDate) ? startDate : null;
  let previousLabel = "the loan start date";
  return events.map((event) => {
    if (!isValidIsoDate(event.date)) return "Enter a valid date (YYYY-MM-DD).";
    if (previous !== null && event.date < previous) {
      return `Out of order: this date is before ${previousLabel} (${previous}).`;
    }
    previous = event.date;
    previousLabel = "the previous event";
    return null;
  });
};
