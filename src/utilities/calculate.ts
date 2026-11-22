import { isValidIsoDate } from "./dates";
import {
  NonTerminatingLoanError,
  type SimulationResult,
  simulate
} from "./simulate";
import { validateEventDates } from "./timeline";

import type { AppState } from "../types";

export type Calculation =
  | {
      status: "ok";
      dateErrors: (string | null)[];
      scenario: SimulationResult;
      baseline: SimulationResult;
    }
  | {
      /** Calculations are not attempted (5.5). */
      status: "paused" | "error";
      message: string;
      dateErrors: (string | null)[];
      baseline: SimulationResult | null;
    };

const runSafely = (run: () => SimulationResult): SimulationResult | null => {
  try {
    return run();
  } catch (error) {
    if (error instanceof NonTerminatingLoanError) return null;
    throw error;
  }
};

const loanIsCalculable = (state: AppState): boolean => {
  const { loan } = state;
  return (
    isValidIsoDate(loan.startDate) &&
    [
      loan.purchasePrice,
      loan.downPayment,
      loan.interestRate,
      loan.termMonths
    ].every(Number.isFinite)
  );
};

/** Calculates the scenario and its baseline (7.6) for the app state. */
export const calculate = (state: AppState): Calculation => {
  const dateErrors = validateEventDates(state.loan.startDate, state.events);

  if (!loanIsCalculable(state)) {
    return {
      status: "paused",
      message: "Enter a valid loan start date to see calculations.",
      dateErrors,
      baseline: null
    };
  }

  const baseline = runSafely(() => simulate(state.loan, []));
  if (baseline === null) {
    return {
      status: "error",
      message: "The loan is never paid off with these values.",
      dateErrors,
      baseline: null
    };
  }

  if (dateErrors.some((error) => error !== null)) {
    return {
      status: "paused",
      message:
        "Calculations are paused until every event has a valid date in chronological order.",
      dateErrors,
      baseline
    };
  }

  const scenario = runSafely(() => simulate(state.loan, state.events));
  if (scenario === null) {
    return {
      status: "error",
      message: "The loan is never paid off with these events.",
      dateErrors,
      baseline
    };
  }

  return { status: "ok", dateErrors, scenario, baseline };
};
