import { Box } from "@mui/material";

import Stat from "./Stat";

import { dayToIso, monthsBetween } from "../utilities/dates";
import {
  currencyDifference,
  formatCurrency,
  formatMonths,
  monthsDifference
} from "../utilities/format";
import type { SimulationResult } from "../utilities/simulate";

interface TimelineSummaryProps {
  scenario: SimulationResult;
  baseline: SimulationResult;
}

/** Final costs of the loan with all events applied (5.9). */
const TimelineSummary: React.FC<TimelineSummaryProps> = ({
  scenario,
  baseline
}) => {
  const final = scenario.final;
  const base = baseline.final;
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }
      }}
    >
      <Stat
        label="Total cost"
        value={formatCurrency(final.totalCost)}
        baseline={formatCurrency(base.totalCost)}
        difference={currencyDifference(final.totalCost, base.totalCost)}
      />
      <Stat
        label="Total interest"
        value={formatCurrency(final.totalInterest)}
        baseline={formatCurrency(base.totalInterest)}
        difference={currencyDifference(final.totalInterest, base.totalInterest)}
      />
      <Stat
        label="Payoff date (final payment)"
        value={dayToIso(final.payoffDay)}
        baseline={dayToIso(base.payoffDay)}
        difference={monthsDifference(
          monthsBetween(base.payoffDay, final.payoffDay),
          0
        )}
      />
      <Stat
        label="Time until payoff"
        value={formatMonths(final.totalMonths)}
        baseline={formatMonths(base.totalMonths)}
        difference={monthsDifference(final.totalMonths, base.totalMonths)}
      />
    </Box>
  );
};

export default TimelineSummary;
