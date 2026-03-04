/**
 * Calculates the monthly payment of an amortized loan (like a mortgage)
 * @param principal The principal of the loan to be amortized
 * @param annualInterestRate The annual interest rate, expressed as a percentage (i.e. 6.5% = `6.5`)
 * @param term The length of the loan in integer months
 * @returns The monthly payment of the loan
 */
export const amortizedLoanPaymentAmount = (
  principal: number,
  annualInterestRate: number,
  term: number
): number => {
  const convertedInterestRate = annualInterestRate / 100;
  const periodicRate = convertedInterestRate / 12;
  return (
    principal /
    (((1 + periodicRate) ** term - 1) /
      (periodicRate * (1 + periodicRate) ** term))
  );
};

/**
 * Calculates the total cost and interest cost of an amortized loan
 * @param principal The principal of the loan to be amortized
 * @param annualInterestRate The annual interest rate, expressed as a percentage (i.e. 6.5% = `6.5`)
 * @param term The length of the loan in integer months
 * @returns The total amount spent on the loan and the amount spent on interest
 */
export const amortizedLoanTotalAmount = (
  principal: number,
  annualInterestRate: number,
  term: number
): { total: number; interest: number } => {
  const monthlyPayment = amortizedLoanPaymentAmount(
    principal,
    annualInterestRate,
    term
  );
  const total = monthlyPayment * term;
  const interest = total - principal;
  return { total, interest };
};
