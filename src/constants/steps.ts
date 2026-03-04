import type React from "react";

import ExtraPaymentStep from "../components/ExtraPaymentStep";
import LumpSumStep from "../components/LumpSumStep";
import PaymentFrequencyStep from "../components/PaymentFrequencyStep";
import RecastStep from "../components/RecastStep";
import RefinanceStep from "../components/RefinanceStep";

interface Step {
  /** Identifies the type of step */
  id: string;
  /** Identifies a specific step */
  key?: string;
  label: string;
  component: React.FC<never>;
  color: string;
}

interface StepProps {
  index: number;
}

const EXTRA_PAYMENT_STEP: Step = {
  id: "extraPayment",
  label: "Make Extra Regular Payments",
  component: ExtraPaymentStep,
  color: "#a3c7e0"
};

const LUMP_SUM_STEP: Step = {
  id: "lumpSum",
  label: "Make a Lump Sum Payment",
  component: LumpSumStep,
  color: "#5cb8d1"
};

const PAYMENT_FREQUENCY_STEP: Step = {
  id: "paymentFrequency",
  label: "Change Payment Frequency",
  component: PaymentFrequencyStep,
  color: "#2f8b9d"
};

const REFINANCE_STEP: Step = {
  id: "refinance",
  label: "Refinance",
  component: RefinanceStep,
  color: "#3d6976"
};

const RECAST_STEP: Step = {
  id: "recast",
  label: "Recast",
  component: RecastStep,
  color: "##3d4976"
};

const STEP_TYPES: Step[] = [
  EXTRA_PAYMENT_STEP,
  LUMP_SUM_STEP,
  PAYMENT_FREQUENCY_STEP,
  REFINANCE_STEP,
  RECAST_STEP
];

export {
  STEP_TYPES,
  EXTRA_PAYMENT_STEP,
  LUMP_SUM_STEP,
  PAYMENT_FREQUENCY_STEP,
  REFINANCE_STEP,
  RECAST_STEP
};
export type { Step, StepProps };
