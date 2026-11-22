import {
  Box,
  Card,
  CardContent,
  Divider,
  Grid,
  Typography
} from "@mui/material";

import Stat from "./Stat";
import {
  CurrencyField,
  DateField,
  FrequencyField,
  PercentField,
  TermField
} from "./fields";

import type { LoanDefinition } from "../types";
import { dayToIso } from "../utilities/dates";
import {
  formatCurrency,
  formatMonths,
  paymentLabel
} from "../utilities/format";
import type { SimulationResult } from "../utilities/simulate";

interface LoanDefinitionCardProps {
  loan: LoanDefinition;
  baseline: SimulationResult | null;
  // eslint-disable-next-line no-unused-vars
  onChange: (loan: LoanDefinition) => void;
}

/** The loan definition (section 4), shown above the timeline. */
const LoanDefinitionCard: React.FC<LoanDefinitionCardProps> = ({
  loan,
  baseline,
  onChange
}) => {
  const update = (changes: Partial<LoanDefinition>) => {
    onChange({ ...loan, ...changes });
  };

  // Sum and percentage are kept in sync (4.4); a new price keeps the percentage
  const setPurchasePrice = (price: number) => {
    update({
      purchasePrice: price,
      downPayment: price * loan.downPaymentPercent
    });
  };
  const setDownPayment = (amount: number) => {
    update({
      downPayment: amount,
      downPaymentPercent:
        loan.purchasePrice === 0 ? 0 : amount / loan.purchasePrice
    });
  };
  const setDownPaymentPercent = (percent: number) => {
    update({
      downPaymentPercent: percent,
      downPayment: loan.purchasePrice * percent
    });
  };

  const loanValue = loan.purchasePrice - loan.downPayment;

  return (
    <Card component="section" aria-labelledby="loan-heading">
      <CardContent>
        <Typography id="loan-heading" variant="h5" component="h2" gutterBottom>
          Loan
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <CurrencyField
              label="Purchase price"
              value={loan.purchasePrice}
              onChange={(value) => {
                setPurchasePrice(value ?? 0);
              }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <CurrencyField
              label="Down payment"
              value={Math.round(loan.downPayment * 100) / 100}
              onChange={(value) => {
                setDownPayment(value ?? 0);
              }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <PercentField
              label="Down payment %"
              value={loan.downPaymentPercent}
              onChange={(value) => {
                setDownPaymentPercent(value ?? 0);
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <PercentField
              label="Interest rate"
              value={loan.interestRate}
              onChange={(value) => {
                update({ interestRate: value ?? 0 });
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TermField
              label="Term (months)"
              value={loan.termMonths}
              onChange={(value) => {
                update({ termMonths: value ?? 0 });
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <DateField
              label="Start date"
              value={loan.startDate}
              onChange={(startDate) => {
                update({ startDate });
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <FrequencyField
              label="Payment frequency"
              value={loan.paymentFrequency}
              onChange={(paymentFrequency) => {
                update({ paymentFrequency });
              }}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Box
          component="dl"
          sx={{
            m: 0,
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr 1fr",
              md: "repeat(5, 1fr)"
            }
          }}
        >
          <Stat label="Loan value" value={formatCurrency(loanValue)} />
          {baseline && (
            <>
              <Stat
                label={paymentLabel(loan.paymentFrequency)}
                value={formatCurrency(baseline.points[0].payment)}
              />
              <Stat
                label="Total cost (no events)"
                value={formatCurrency(baseline.final.totalCost)}
              />
              <Stat
                label="Total interest (no events)"
                value={formatCurrency(baseline.final.totalInterest)}
              />
              <Stat
                label="Payoff (no events)"
                value={dayToIso(baseline.final.payoffDay)}
                baseline={undefined}
              />
            </>
          )}
        </Box>
        {baseline && (
          <Typography variant="caption" color="text.secondary">
            Baseline: the loan with no events, paid off in{" "}
            {formatMonths(baseline.final.totalMonths)}.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default LoanDefinitionCard;
