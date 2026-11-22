import { Box, Tooltip, Typography } from "@mui/material";

import AddEventMenu from "./AddEventMenu";

import type { EventType, LoanDefinition } from "../types";
import { monthsBetween } from "../utilities/dates";
import {
  currencyDifference,
  formatCurrency,
  formatMonths,
  monthsDifference,
  paymentLabel
} from "../utilities/format";
import {
  type PointResult,
  type SimulationResult,
  balanceAt
} from "../utilities/simulate";

interface TimelineSegmentProps {
  /** Describes the items around the segment, e.g. "between X and Y". */
  positionLabel: string;
  point: PointResult | null;
  baseline: SimulationResult | null;
  loan: LoanDefinition;
  menuOpen: boolean;
  // eslint-disable-next-line no-unused-vars
  onMenuOpenChange: (open: boolean) => void;
  // eslint-disable-next-line no-unused-vars
  onAdd: (type: EventType) => void;
}

interface Row {
  label: string;
  value: string;
  comparison: string;
}

/** The values for the segment's point in time, with baseline comparisons (5.8). */
const segmentRows = (
  point: PointResult,
  baseline: SimulationResult,
  loan: LoanDefinition
): Row[] => {
  const basePayment = baseline.points[0].payment;
  const baseBalance = balanceAt(baseline, loan, point.day);
  const payoffDiff = monthsBetween(baseline.final.payoffDay, point.payoffDay);
  const payment = point.payment + point.extra;
  return [
    {
      label: paymentLabel(point.frequency),
      value:
        formatCurrency(point.payment) +
        (point.extra > 0 ? ` + ${formatCurrency(point.extra)} extra` : ""),
      comparison: `baseline ${formatCurrency(basePayment)}, ${
        currencyDifference(payment, basePayment).text
      }`
    },
    {
      label: "Remaining balance",
      value: formatCurrency(point.balance),
      comparison: `baseline ${formatCurrency(baseBalance)}, ${
        currencyDifference(point.balance, baseBalance).text
      }`
    },
    {
      label: "Time until payoff",
      value: formatMonths(point.remainingMonths),
      comparison: monthsDifference(payoffDiff, 0).text
    },
    {
      label: "Total cost of the loan",
      value: formatCurrency(point.totalCost),
      comparison: `baseline ${formatCurrency(baseline.final.totalCost)}, ${
        currencyDifference(point.totalCost, baseline.final.totalCost).text
      }`
    }
  ];
};

/**
 * A line segment between two timeline items, with its add button and a
 * tooltip showing the loan's state for that stretch of time (5.3, 5.8).
 */
const TimelineSegment: React.FC<TimelineSegmentProps> = ({
  positionLabel,
  point,
  baseline,
  loan,
  menuOpen,
  onMenuOpenChange,
  onAdd
}) => {
  const rows = point && baseline ? segmentRows(point, baseline, loan) : null;

  const line = (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        mx: "auto",
        width: 24,
        display: "flex",
        justifyContent: "center",
        cursor: rows ? "help" : "default",
        borderRadius: 1,
        "&::before": {
          content: '""',
          width: 4,
          height: "100%",
          bgcolor: "divider",
          borderRadius: 2,
          transition: "background-color 150ms"
        },
        "&:hover::before, &:focus-visible::before": rows
          ? { bgcolor: "primary.main" }
          : undefined,
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main"
        }
      }}
      tabIndex={rows ? 0 : undefined}
      role={rows ? "note" : undefined}
      aria-label={rows ? `Loan status ${positionLabel}` : undefined}
    />
  );

  return (
    <Box
      sx={{
        position: "relative",
        height: 112,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      {rows ? (
        <Tooltip
          describeChild
          followCursor
          placement="right"
          title={
            <Box component="dl" sx={{ m: 0, p: 0.5 }}>
              {rows.map((row) => (
                <Box
                  key={row.label}
                  sx={{ mb: 0.75, "&:last-child": { mb: 0 } }}
                >
                  <Typography
                    component="dt"
                    variant="caption"
                    sx={{ opacity: 0.8 }}
                  >
                    {row.label}
                  </Typography>
                  <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                    <strong>{row.value}</strong>
                    <br />
                    <Typography component="span" variant="caption">
                      {row.comparison}
                    </Typography>
                  </Typography>
                </Box>
              ))}
            </Box>
          }
        >
          {line}
        </Tooltip>
      ) : (
        line
      )}
      <Box sx={{ position: "relative" }}>
        <AddEventMenu
          positionLabel={positionLabel}
          open={menuOpen}
          onOpenChange={onMenuOpenChange}
          onSelect={onAdd}
        />
      </Box>
    </Box>
  );
};

export default TimelineSegment;
