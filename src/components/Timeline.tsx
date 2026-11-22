import { useCallback, useRef, useState } from "react";

import FlagIcon from "@mui/icons-material/Flag";
import HomeIcon from "@mui/icons-material/Home";
import { Alert, Box, Card, CardContent, Typography } from "@mui/material";

import EventCard from "./EventCard";
import TimelineSegment from "./TimelineSegment";
import TimelineSummary from "./TimelineSummary";

import { EVENT_META } from "../constants/events";
import type { AppState, EventType, TimelineEvent } from "../types";
import type { Calculation } from "../utilities/calculate";
import { dayToIso, isValidIsoDate } from "../utilities/dates";
import { formatCurrency, paymentLabel } from "../utilities/format";
import {
  insertEvent,
  moveEvent,
  removeEvent,
  updateEvent
} from "../utilities/timeline";

interface TimelineProps {
  state: AppState;
  calculation: Calculation;
  // eslint-disable-next-line no-unused-vars
  onEventsChange: (events: TimelineEvent[]) => void;
  /** Announces a message to screen readers. */
  // eslint-disable-next-line no-unused-vars
  announce: (message: string) => void;
}

interface DragState {
  id: string;
  from: number;
  startY: number;
  offset: number;
  target: number;
}

const describe = (event: TimelineEvent) =>
  `${EVENT_META[event.type].label} on ${event.date || "no date"}`;

const NodeCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <Card variant="outlined" sx={{ borderRadius: 4, borderWidth: 2 }}>
    <CardContent>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Box sx={{ display: "flex", color: "primary.main" }} aria-hidden>
          {icon}
        </Box>
        <Typography variant="h6" component="h3">
          {title}
        </Typography>
      </Box>
      {children}
    </CardContent>
  </Card>
);

/** The vertical timeline of the loan (section 5). */
const Timeline: React.FC<TimelineProps> = ({
  state,
  calculation,
  onEventsChange,
  announce
}) => {
  const { loan, events } = state;
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());

  const scenario = calculation.status === "ok" ? calculation.scenario : null;
  const baseline = calculation.baseline;

  const add = (index: number, type: EventType) => {
    const next = insertEvent(loan, events, index, type);
    onEventsChange(next);
    announce(`Added ${describe(next[index])}.`);
  };

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = moveEvent(events, from, to);
    onEventsChange(next);
    announce(
      `Moved ${EVENT_META[next[to].type].label} to position ${(to + 1).toString()} of ${next.length.toString()}. Its date is now ${next[to].date}.`
    );
  };

  /** Index the dragged card would drop at, from the pointer position. */
  const dropTarget = useCallback(
    (id: string, pointerY: number): number => {
      let target = 0;
      for (const event of events) {
        if (event.id === id) continue;
        const rect = itemRefs.current.get(event.id)?.getBoundingClientRect();
        if (rect && pointerY > rect.top + rect.height / 2) target += 1;
      }
      return target;
    },
    [events]
  );

  const startDrag = (
    pointerEvent: React.PointerEvent<HTMLButtonElement>,
    id: string,
    from: number
  ) => {
    if (pointerEvent.button !== 0) return;
    pointerEvent.preventDefault();
    const handle = pointerEvent.currentTarget;
    handle.setPointerCapture(pointerEvent.pointerId);
    const startY = pointerEvent.clientY;
    setDrag({ id, from, startY, offset: 0, target: from });

    const onMove = (moveEvent: PointerEvent) => {
      setDrag({
        id,
        from,
        startY,
        offset: moveEvent.clientY - startY,
        target: dropTarget(id, moveEvent.clientY)
      });
    };
    const onEnd = (endEvent: PointerEvent) => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onEnd);
      handle.removeEventListener("pointercancel", onEnd);
      setDrag(null);
      if (endEvent.type === "pointerup") {
        move(from, dropTarget(id, endEvent.clientY));
      }
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onEnd);
    handle.addEventListener("pointercancel", onEnd);
  };

  const menuProps = (index: number) => ({
    menuOpen: openMenu === index,
    onMenuOpenChange: (open: boolean) => {
      setOpenMenu(open ? index : null);
    },
    onAdd: (type: EventType) => {
      add(index, type);
    }
  });

  const positionLabel = (index: number) => {
    const before = index === 0 ? "the loan start" : describe(events[index - 1]);
    const after =
      index === events.length ? "the loan end" : describe(events[index]);
    return `between ${before} and ${after}`;
  };

  const dropIndicator = (
    <Box
      aria-hidden
      sx={{ height: 4, bgcolor: "primary.main", borderRadius: 2, my: -0.25 }}
    />
  );

  // Where the drop indicator goes, in terms of the original list
  const indicatorBefore =
    drag && drag.target !== drag.from
      ? drag.target > drag.from
        ? drag.target + 1
        : drag.target
      : null;

  return (
    <Box component="section" aria-labelledby="timeline-heading">
      <Typography
        id="timeline-heading"
        variant="h5"
        component="h2"
        sx={{ mb: 2 }}
      >
        Timeline
      </Typography>
      {calculation.status !== "ok" && (
        <Alert severity="warning" sx={{ mb: 2 }} role="status">
          {calculation.message}
        </Alert>
      )}
      <Box
        component="ol"
        aria-label={`Loan timeline with ${events.length.toString()} event${events.length === 1 ? "" : "s"}`}
        sx={{ listStyle: "none", m: 0, p: 0 }}
      >
        <li>
          <NodeCard icon={<HomeIcon />} title="Loan start">
            <Typography>
              {isValidIsoDate(loan.startDate)
                ? loan.startDate
                : "No valid start date"}
              {" · "}Loan value{" "}
              {formatCurrency(loan.purchasePrice - loan.downPayment)}
              {baseline && (
                <>
                  {" · "}
                  {paymentLabel(loan.paymentFrequency)}{" "}
                  {formatCurrency(baseline.points[0].payment)}
                </>
              )}
            </Typography>
          </NodeCard>
          <TimelineSegment
            positionLabel={positionLabel(0)}
            point={scenario?.points[0] ?? null}
            baseline={baseline}
            loan={loan}
            {...menuProps(0)}
          />
        </li>
        {events.map((event, index) => (
          <li
            key={event.id}
            ref={(element) => {
              if (element) itemRefs.current.set(event.id, element);
              else itemRefs.current.delete(event.id);
            }}
          >
            {indicatorBefore === index && dropIndicator}
            <EventCard
              event={event}
              position={index}
              count={events.length}
              status={scenario?.eventStatus[index] ?? null}
              payoffDay={scenario?.final.payoffDay ?? null}
              dateError={calculation.dateErrors[index] ?? null}
              dragging={drag?.id === event.id}
              dragOffset={drag?.id === event.id ? drag.offset : 0}
              onChange={(updated) => {
                onEventsChange(updateEvent(events, updated));
              }}
              onDelete={() => {
                onEventsChange(removeEvent(events, event.id));
                announce(`Deleted ${describe(event)}.`);
              }}
              onDragStart={(pointerEvent) => {
                startDrag(pointerEvent, event.id, index);
              }}
              onMoveBy={(offset) => {
                move(index, index + offset);
              }}
            />
            {indicatorBefore === events.length &&
              index === events.length - 1 &&
              dropIndicator}
            <TimelineSegment
              positionLabel={positionLabel(index + 1)}
              point={scenario?.points[index + 1] ?? null}
              baseline={baseline}
              loan={loan}
              {...menuProps(index + 1)}
            />
          </li>
        ))}
        <li>
          <NodeCard icon={<FlagIcon />} title="Loan end">
            {scenario && baseline ? (
              <TimelineSummary scenario={scenario} baseline={baseline} />
            ) : (
              <Typography color="text.secondary">
                {baseline
                  ? `The summary is shown once calculations resume. Without events the loan is paid off on ${dayToIso(baseline.final.payoffDay)}.`
                  : "The summary is shown once calculations resume."}
              </Typography>
            )}
          </NodeCard>
        </li>
      </Box>
    </Box>
  );
};

export default Timeline;
