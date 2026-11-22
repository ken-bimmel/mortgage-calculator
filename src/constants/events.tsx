import type { ReactElement } from "react";

import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import PaymentsIcon from "@mui/icons-material/Payments";
import SavingsIcon from "@mui/icons-material/Savings";

import type { EventType } from "../types";

export interface EventMeta {
  label: string;
  shortLabel: string;
  description: string;
  icon: ReactElement;
  color: string;
}

export const EVENT_META: Record<EventType, EventMeta> = {
  recast: {
    label: "Recast",
    shortLabel: "Recast",
    description: "Pay down principal and re-amortize over a new term",
    icon: <AutorenewIcon />,
    color: "#8c9eff"
  },
  lumpSum: {
    label: "Lump Sum Payment",
    shortLabel: "Lump sum",
    description: "One-time payment toward principal",
    icon: <PaymentsIcon />,
    color: "#5cb8d1"
  },
  extraPayment: {
    label: "Extra Regular Payment",
    shortLabel: "Extra payment",
    description: "Add an extra amount to every payment",
    icon: <SavingsIcon />,
    color: "#a3c7e0"
  },
  refinance: {
    label: "Refinance",
    shortLabel: "Refinance",
    description: "Replace the loan with a new rate and term",
    icon: <AccountBalanceIcon />,
    color: "#4db6ac"
  },
  paymentFrequency: {
    label: "Change Payment Frequency",
    shortLabel: "Frequency",
    description: "Change how often payments are made",
    icon: <EventRepeatIcon />,
    color: "#ffb74d"
  }
};
