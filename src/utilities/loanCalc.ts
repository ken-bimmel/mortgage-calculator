/**
 * Standard closed-form amortization formulas (requirements 7.3).
 * All rates are decimals (0.065 for 6.5%).
 */

/**
 * Periodic payment `P = L · r / (1 − (1 + r)^(−n))`.
 * With no payments left (`n < 1`) the whole balance plus one period's
 * interest is due at the next payment. A zero rate splits the balance evenly.
 * @param principal The balance `L` to amortize
 * @param periodicRate The interest rate per payment period `r`
 * @param payments The number of payments `n`
 */
export const periodicPayment = (
  principal: number,
  periodicRate: number,
  payments: number
): number => {
  if (payments < 1) return principal * (1 + periodicRate);
  if (periodicRate === 0) return principal / payments;
  return (principal * periodicRate) / (1 - (1 + periodicRate) ** -payments);
};

/**
 * Monthly payment of a fixed-rate amortized loan.
 * @param principal The principal of the loan
 * @param annualInterestRate The annual interest rate as a decimal (6.5% = `0.065`)
 * @param termMonths The length of the loan in months
 */
export const amortizedLoanPaymentAmount = (
  principal: number,
  annualInterestRate: number,
  termMonths: number
): number => periodicPayment(principal, annualInterestRate / 12, termMonths);

/**
 * Number of payments until payoff, `n = −ln(1 − L · r / (P + E)) / ln(1 + r)`.
 * Returns `Infinity` when the payment never covers the interest.
 * @param principal The balance `L`
 * @param periodicRate The interest rate per payment period `r`
 * @param payment The regular payment `P`
 * @param extra Extra amount `E` paid with every payment
 */
export const paymentsToPayoff = (
  principal: number,
  periodicRate: number,
  payment: number,
  extra = 0
): number => {
  if (principal <= 0) return 0;
  const total = payment + extra;
  if (total <= 0) return Infinity;
  if (periodicRate === 0) return principal / total;
  const x = 1 - (principal * periodicRate) / total;
  if (x <= 0) return Infinity;
  return -Math.log(x) / Math.log(1 + periodicRate);
};

/**
 * Projected totals of an amortized loan from its current state, with no
 * further events (total interest = payments − L; total cost = payments + fees).
 */
export const amortizedLoanTotalAmount = (
  principal: number,
  periodicRate: number,
  payments: number,
  fees = 0
): { total: number; interest: number } => {
  const paid = periodicPayment(principal, periodicRate, payments) * payments;
  return { total: paid + fees, interest: paid - principal };
};
