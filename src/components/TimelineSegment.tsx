import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { Box, Tooltip, Typography } from "@mui/material";

import AddEventMenu from "./AddEventMenu";

import type { EventType, LoanDefinition } from "../types";
import { monthsBetween } from "../utilities/dates";
import {
  type Difference,
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
  /** Baseline value shown before the difference, if any. */
  baseline?: string;
  difference: Difference;
}

// Lighter shades, since the tooltip background is dark.
const DIFFERENCE_COLORS = {
  down: "success.light",
  up: "error.light",
  none: "inherit"
} as const;

/** A difference, green with a down arrow if lower, red with an up arrow if higher. */
const DifferenceText: React.FC<{ difference: Difference }> = ({
  difference
}) => {
  const Arrow =
    difference.direction === "up"
      ? ArrowUpwardIcon
      : difference.direction === "down"
        ? ArrowDownwardIcon
        : null;
  return (
    <Box
      component="span"
      sx={{
        color: DIFFERENCE_COLORS[difference.direction],
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center"
      }}
    >
      {Arrow && <Arrow sx={{ fontSize: "1em" }} aria-hidden />}
      {difference.text}
    </Box>
  );
};

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
      baseline: formatCurrency(basePayment),
      difference: currencyDifference(payment, basePayment)
    },
    {
      label: "Remaining balance",
      value: formatCurrency(point.balance),
      baseline: formatCurrency(baseBalance),
      difference: currencyDifference(point.balance, baseBalance)
    },
    {
      label: "Time until payoff",
      value: formatMonths(point.remainingMonths),
      difference: monthsDifference(payoffDiff, 0)
    },
    {
      label: "Total cost of the loan",
      value: formatCurrency(point.totalCost),
      baseline: formatCurrency(baseline.final.totalCost),
      difference: currencyDifference(point.totalCost, baseline.final.totalCost)
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
                      {row.baseline !== undefined &&
                        `baseline ${row.baseline}, `}
                      <DifferenceText difference={row.difference} />
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
