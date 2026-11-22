import { useEffect, useId, useRef, useState } from "react";

import AddIcon from "@mui/icons-material/Add";
import {
  Box,
  Button,
  ClickAwayListener,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme
} from "@mui/material";

import { EVENT_META } from "../constants/events";
import { EVENT_TYPES, type EventType } from "../types";

/** Distance from the add button's center to each option's center. The ring
 * is wider than it is tall so the option labels do not overlap. */
const RING_RADIUS_X = 150;
const RING_RADIUS_Y = 100;
/** Space needed around the button for the ring and its option labels. */
const RING_EXTENT_X = RING_RADIUS_X + 72;
const RING_EXTENT_Y = RING_RADIUS_Y + 24;

interface AddEventMenuProps {
  /** Describes where the event will be added, for screen readers. */
  positionLabel: string;
  open: boolean;
  // eslint-disable-next-line no-unused-vars
  onOpenChange: (open: boolean) => void;
  // eslint-disable-next-line no-unused-vars
  onSelect: (type: EventType) => void;
}

/**
 * The add button on a timeline segment and its ring of event options
 * (5.3). Falls back to a vertical list on small screens or near the
 * viewport edges.
 */
const AddEventMenu: React.FC<AddEventMenuProps> = ({
  positionLabel,
  open,
  onOpenChange,
  onSelect
}) => {
  const theme = useTheme();
  const small = useMediaQuery(theme.breakpoints.down("sm"));
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [ringFits, setRingFits] = useState(true);
  const menuId = useId();

  const useRing = !small && ringFits;

  const close = (restoreFocus: boolean) => {
    onOpenChange(false);
    if (restoreFocus) buttonRef.current?.focus();
  };

  const toggle = () => {
    if (open) {
      close(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      setRingFits(
        cx - RING_EXTENT_X >= 0 &&
          cx + RING_EXTENT_X <= window.innerWidth &&
          cy - RING_EXTENT_Y >= 0 &&
          cy + RING_EXTENT_Y <= window.innerHeight
      );
    }
    onOpenChange(true);
  };

  // Move focus to the first option when the ring opens
  useEffect(() => {
    if (open && useRing) optionRefs.current[0]?.focus();
  }, [open, useRing]);

  // Escape dismisses the ring wherever focus is
  useEffect(() => {
    if (!open || !useRing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, useRing, onOpenChange]);

  const choose = (type: EventType) => {
    onSelect(type);
    onOpenChange(false);
  };

  const onRingKeyDown = (event: React.KeyboardEvent) => {
    const count = EVENT_TYPES.length;
    const current = optionRefs.current.findIndex(
      (option) => option === document.activeElement
    );
    let next: number | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (current + 1) % count;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (current - 1 + count) % count;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
      case "Tab":
        close(false);
        return;
    }
    if (next !== null) {
      event.preventDefault();
      optionRefs.current[next]?.focus();
    }
  };

  const button = (
    <IconButton
      ref={buttonRef}
      aria-label={`Add event ${positionLabel}`}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      onClick={toggle}
      size="small"
      sx={{
        bgcolor: "background.paper",
        border: 2,
        borderColor: open ? "primary.main" : "divider",
        transition: "transform 150ms",
        transform: open && useRing ? "rotate(45deg)" : "none",
        "&:hover": { bgcolor: "background.paper", borderColor: "primary.main" }
      }}
    >
      <AddIcon />
    </IconButton>
  );

  return (
    <ClickAwayListener
      onClickAway={() => {
        if (open && useRing) close(false);
      }}
    >
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        {button}
        {open && useRing && (
          <Box
            id={menuId}
            role="menu"
            aria-label="Choose an event to add"
            onKeyDown={onRingKeyDown}
            sx={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 0,
              height: 0,
              zIndex: theme.zIndex.speedDial
            }}
          >
            {EVENT_TYPES.map((type, index) => {
              const angle =
                -Math.PI / 2 + (index * 2 * Math.PI) / EVENT_TYPES.length;
              const meta = EVENT_META[type];
              return (
                <Button
                  key={type}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  role="menuitem"
                  variant="contained"
                  size="small"
                  title={meta.description}
                  startIcon={meta.icon}
                  onClick={() => {
                    choose(type);
                  }}
                  sx={{
                    position: "absolute",
                    left: Math.cos(angle) * RING_RADIUS_X,
                    top: Math.sin(angle) * RING_RADIUS_Y,
                    transform: "translate(-50%, -50%)",
                    whiteSpace: "nowrap",
                    borderRadius: 999,
                    bgcolor: meta.color,
                    color: "rgba(0, 0, 0, 0.87)",
                    boxShadow: 6,
                    "&:hover": {
                      bgcolor: meta.color,
                      filter: "brightness(1.1)"
                    },
                    "&:focus-visible": {
                      outline: "3px solid",
                      outlineColor: "common.white",
                      outlineOffset: 2
                    },
                    "@media (prefers-reduced-motion: no-preference)": {
                      animation: "ring-in 150ms ease-out"
                    },
                    "@keyframes ring-in": {
                      from: { opacity: 0, left: 0, top: 0 }
                    }
                  }}
                >
                  {meta.shortLabel}
                </Button>
              );
            })}
          </Box>
        )}
        <Menu
          id={useRing ? undefined : menuId}
          anchorEl={() => buttonRef.current!}
          open={open && !useRing}
          onClose={() => {
            close(true);
          }}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          transformOrigin={{ vertical: "top", horizontal: "center" }}
          slotProps={{
            list: { "aria-label": "Choose an event to add" },
            paper: { sx: { maxWidth: "calc(100vw - 32px)" } }
          }}
        >
          {EVENT_TYPES.map((type) => (
            <MenuItem
              key={type}
              onClick={() => {
                choose(type);
              }}
              sx={{ py: 1.5, whiteSpace: "normal" }}
            >
              <ListItemIcon sx={{ color: EVENT_META[type].color }}>
                {EVENT_META[type].icon}
              </ListItemIcon>
              <ListItemText
                primary={EVENT_META[type].label}
                secondary={EVENT_META[type].description}
              />
            </MenuItem>
          ))}
        </Menu>
      </Box>
    </ClickAwayListener>
  );
};

export default AddEventMenu;
