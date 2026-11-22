import { useId } from "react";

import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import {
  Alert,
  Box,
  Card,
  CardContent,
  FormControlLabel,
  Grid,
  IconButton,
  Switch,
  Tooltip,
  Typography
} from "@mui/material";

import {
  CurrencyField,
  DateField,
  FrequencyField,
  PercentField,
  TermField
} from "./fields";

import { EVENT_META } from "../constants/events";
import type { TimelineEvent } from "../types";
import { dayToIso } from "../utilities/dates";
import type { EventStatus } from "../utilities/simulate";

interface EventCardProps {
  event: TimelineEvent;
  position: number;
  count: number;
  status: EventStatus | null;
  /** Payoff date of the loan, for the after-payoff warning. */
  payoffDay: number | null;
  dateError: string | null;
  dragging: boolean;
  dragOffset: number;
  // eslint-disable-next-line no-unused-vars
  onChange: (event: TimelineEvent) => void;
  onDelete: () => void;
  // eslint-disable-next-line no-unused-vars
  onDragStart: (event: React.PointerEvent<HTMLButtonElement>) => void;
  // eslint-disable-next-line no-unused-vars
  onMoveBy: (offset: number) => void;
}

const fieldError = (status: EventStatus | null, field: string) =>
  status?.kind === "invalid" && status.field === field ? status.message : null;

const EventFields: React.FC<{
  event: TimelineEvent;
  status: EventStatus | null;
  // eslint-disable-next-line no-unused-vars
  onChange: (event: TimelineEvent) => void;
}> = ({ event, status, onChange }) => {
  const cell = { xs: 12, sm: 6, md: 3 } as const;
  switch (event.type) {
    case "recast":
      return (
        <>
          <Grid size={cell}>
            <CurrencyField
              label="Principal payment"
              value={event.principalPayment}
              error={fieldError(status, "principalPayment")}
              onChange={(principalPayment) => {
                onChange({ ...event, principalPayment });
              }}
            />
          </Grid>
          <Grid size={cell}>
            <CurrencyField
              label="Recast fee"
              value={event.recastFee}
              error={fieldError(status, "recastFee")}
              onChange={(recastFee) => {
                onChange({ ...event, recastFee });
              }}
            />
          </Grid>
          <Grid size={cell}>
            <TermField
              label="New term (months)"
              value={event.newTermMonths}
              error={fieldError(status, "newTermMonths")}
              onChange={(newTermMonths) => {
                onChange({ ...event, newTermMonths });
              }}
            />
          </Grid>
        </>
      );
    case "lumpSum":
    case "extraPayment":
      return (
        <Grid size={cell}>
          <CurrencyField
            label={event.type === "lumpSum" ? "Amount" : "Extra per payment"}
            value={event.amount}
            error={fieldError(status, "amount")}
            onChange={(amount) => {
              onChange({ ...event, amount });
            }}
          />
        </Grid>
      );
    case "refinance":
      return (
        <>
          <Grid size={cell}>
            <PercentField
              label="New interest rate"
              value={event.newInterestRate}
              error={fieldError(status, "newInterestRate")}
              onChange={(newInterestRate) => {
                onChange({ ...event, newInterestRate });
              }}
            />
          </Grid>
          <Grid size={cell}>
            <TermField
              label="New term (months)"
              value={event.newTermMonths}
              error={fieldError(status, "newTermMonths")}
              onChange={(newTermMonths) => {
                onChange({ ...event, newTermMonths });
              }}
            />
          </Grid>
          <Grid size={cell}>
            <CurrencyField
              label="Closing costs"
              value={event.closingCosts}
              error={fieldError(status, "closingCosts")}
              onChange={(closingCosts) => {
                onChange({ ...event, closingCosts });
              }}
            />
          </Grid>
          <Grid size={cell}>
            <CurrencyField
              label="Cash-out amount (optional)"
              value={event.cashOutAmount}
              error={fieldError(status, "cashOutAmount")}
              onChange={(cashOutAmount) => {
                onChange({ ...event, cashOutAmount });
              }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={event.rollCostsIntoPrincipal}
                  onChange={(_, rollCostsIntoPrincipal) => {
                    onChange({ ...event, rollCostsIntoPrincipal });
                  }}
                />
              }
              label="Roll closing costs into principal"
            />
          </Grid>
        </>
      );
    case "paymentFrequency":
      return (
        <Grid size={cell}>
          <FrequencyField
            label="Payment frequency"
            value={event.paymentFrequency}
            onChange={(paymentFrequency) => {
              onChange({ ...event, paymentFrequency });
            }}
          />
        </Grid>
      );
  }
};

/** An event on the timeline (5.4), editable in place. */
const EventCard: React.FC<EventCardProps> = ({
  event,
  position,
  count,
  status,
  payoffDay,
  dateError,
  dragging,
  dragOffset,
  onChange,
  onDelete,
  onDragStart,
  onMoveBy
}) => {
  const meta = EVENT_META[event.type];
  const headingId = useId();
  const afterPayoff = status?.kind === "afterPayoff";
  const invalid = status?.kind === "invalid";
  const flagged = afterPayoff || invalid || dateError !== null;

  const onHandleKeyDown = (keyEvent: React.KeyboardEvent) => {
    if (keyEvent.key === "ArrowUp" && position > 0) {
      keyEvent.preventDefault();
      onMoveBy(-1);
    } else if (keyEvent.key === "ArrowDown" && position < count - 1) {
      keyEvent.preventDefault();
      onMoveBy(1);
    }
  };

  return (
    <Card
      component="article"
      aria-labelledby={headingId}
      variant="outlined"
      sx={{
        position: "relative",
        borderRadius: 4,
        borderWidth: 2,
        borderColor: flagged ? "error.main" : meta.color,
        transform: dragging ? `translateY(${dragOffset.toString()}px)` : "none",
        zIndex: dragging ? 10 : "auto",
        boxShadow: dragging ? 12 : 0,
        opacity: dragging ? 0.92 : 1,
        transition: dragging ? "none" : "transform 150ms"
      }}
    >
      <CardContent>
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, pr: 5 }}
        >
          <Tooltip title="Drag to reorder, or focus and use the arrow keys">
            <IconButton
              size="small"
              aria-label={`Reorder ${meta.label}, position ${(position + 1).toString()} of ${count.toString()}. Use the up and down arrow keys to move it.`}
              onPointerDown={onDragStart}
              onKeyDown={onHandleKeyDown}
              sx={{
                cursor: dragging ? "grabbing" : "grab",
                touchAction: "none"
              }}
            >
              <DragIndicatorIcon />
            </IconButton>
          </Tooltip>
          <Box sx={{ color: meta.color, display: "flex" }} aria-hidden>
            {meta.icon}
          </Box>
          <Typography id={headingId} variant="h6" component="h3">
            {meta.label}
          </Typography>
        </Box>
        <Tooltip title="Delete event">
          <IconButton
            aria-label={`Delete ${meta.label} on ${event.date}`}
            onClick={onDelete}
            sx={{ position: "absolute", top: 8, right: 8 }}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <DateField
              label="Date"
              value={event.date}
              error={dateError}
              onChange={(date) => {
                onChange({ ...event, date });
              }}
            />
          </Grid>
          <EventFields event={event} status={status} onChange={onChange} />
        </Grid>

        {afterPayoff && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            This event is after the loan is paid off
            {payoffDay !== null ? ` (${dayToIso(payoffDay)})` : ""} and is
            ignored in all calculations.
          </Alert>
        )}
        {invalid && (
          <Alert severity="error" sx={{ mt: 1 }}>
            This event is invalid and is ignored in calculations:{" "}
            {status.message}
          </Alert>
        )}
        {dateError !== null && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {dateError} Calculations are paused until it is fixed.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default EventCard;
