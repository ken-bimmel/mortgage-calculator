import { useId, useRef, useState } from "react";

import EventIcon from "@mui/icons-material/Event";
import { IconButton, InputAdornment, MenuItem, TextField } from "@mui/material";
import { NumericFormat, PatternFormat } from "react-number-format";

import { PAYMENT_FREQUENCIES, type PaymentFrequency } from "../types";
import { isValidIsoDate } from "../utilities/dates";
import { FREQUENCY_LABELS, formatMonths } from "../utilities/format";

interface BaseFieldProps {
  label: string;
  error?: string | null;
  helperText?: string;
}

const helper = (error?: string | null, helperText?: string) =>
  error ?? helperText ?? " ";

type NumberKind = "currency" | "percent" | "integer";

interface NumberFieldProps extends BaseFieldProps {
  kind: NumberKind;
  /** Stored value: dollars, a decimal rate (0.05 for 5%), or a whole number. */
  value: number | null;
  // eslint-disable-next-line no-unused-vars
  onChange: (value: number | null) => void;
}

/** Converts a stored value to the text shown in the field. */
const toText = (kind: NumberKind, value: number | null): string => {
  if (value === null || !Number.isFinite(value)) return "";
  // Percentages are shown as percent numbers (8.5); rounding hides float noise
  const shown = kind === "percent" ? Number((value * 100).toFixed(6)) : value;
  return shown.toString();
};

const fromText = (kind: NumberKind, text: string): number | null => {
  if (text.trim() === "" || text === "-" || text === ".") return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;
  return kind === "percent" ? parsed / 100 : parsed;
};

/**
 * A masked number field (8.5). Keeps the typed text locally so partial input
 * such as "6." is not reformatted while typing.
 */
export const NumberField: React.FC<NumberFieldProps> = ({
  kind,
  label,
  value,
  onChange,
  error,
  helperText
}) => {
  const [text, setText] = useState(() => toText(kind, value));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (fromText(kind, text) !== value) setText(toText(kind, value));
  }

  return (
    <NumericFormat
      customInput={TextField}
      fullWidth
      label={label}
      value={text}
      valueIsNumericString
      thousandSeparator={false}
      allowNegative={false}
      decimalScale={kind === "currency" ? 2 : kind === "percent" ? 3 : 0}
      prefix={kind === "currency" ? "$" : undefined}
      suffix={kind === "percent" ? "%" : undefined}
      inputMode={kind === "integer" ? "numeric" : "decimal"}
      error={Boolean(error)}
      helperText={helper(error, helperText)}
      onValueChange={(values, { source }) => {
        // Ignore changes caused by prop updates; only react to user input
        if ((source as string) !== "event") return;
        setText(values.value);
        const next = fromText(kind, values.value);
        setLastValue(next);
        onChange(next);
      }}
    />
  );
};

export const CurrencyField: React.FC<Omit<NumberFieldProps, "kind">> = (
  props
) => <NumberField kind="currency" {...props} />;

export const PercentField: React.FC<Omit<NumberFieldProps, "kind">> = (
  props
) => <NumberField kind="percent" {...props} />;

/** A term in months, with the years and months equivalent shown beside it. */
export const TermField: React.FC<Omit<NumberFieldProps, "kind">> = (props) => (
  <NumberField
    kind="integer"
    {...props}
    helperText={props.value === null ? " " : formatMonths(props.value)}
  />
);

interface DateFieldProps extends BaseFieldProps {
  value: string;
  // eslint-disable-next-line no-unused-vars
  onChange: (value: string) => void;
}

/** An ISO date field (YYYY-MM-DD), masked and validated (8.5). */
export const DateField: React.FC<DateFieldProps> = ({
  label,
  value,
  onChange,
  error,
  helperText
}) => {
  const pickerRef = useRef<HTMLInputElement>(null);
  const complete = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const invalid = complete && !isValidIsoDate(value);
  const shownError =
    error ?? (invalid ? "Enter a valid date (YYYY-MM-DD)." : null);
  const openPicker = () => {
    const input = pickerRef.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  };
  return (
    <PatternFormat
      customInput={TextField}
      fullWidth
      label={label}
      format="####-##-##"
      mask="_"
      placeholder="YYYY-MM-DD"
      inputMode="numeric"
      value={value}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                aria-label={`Choose ${label.toLowerCase()} from calendar`}
                onClick={openPicker}
              >
                <EventIcon />
              </IconButton>
              <input
                ref={pickerRef}
                type="date"
                tabIndex={-1}
                aria-hidden
                value={complete && !invalid ? value : ""}
                onChange={(event) => {
                  if (event.target.value) onChange(event.target.value);
                }}
                style={{
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                  width: 0,
                  height: 0,
                  opacity: 0,
                  pointerEvents: "none"
                }}
              />
            </InputAdornment>
          )
        }
      }}
      error={Boolean(shownError)}
      helperText={helper(shownError, helperText ?? "YYYY-MM-DD")}
      onValueChange={(values, { source }) => {
        // Ignore changes caused by prop updates; only react to user input
        if ((source as string) !== "event") return;
        onChange(values.value === "" ? "" : values.formattedValue);
      }}
    />
  );
};

interface FrequencyFieldProps extends BaseFieldProps {
  value: PaymentFrequency;
  // eslint-disable-next-line no-unused-vars
  onChange: (value: PaymentFrequency) => void;
}

export const FrequencyField: React.FC<FrequencyFieldProps> = ({
  label,
  value,
  onChange,
  helperText
}) => {
  const id = useId();
  return (
    <TextField
      select
      fullWidth
      id={id}
      label={label}
      value={value}
      helperText={helperText ?? " "}
      onChange={(event) => {
        onChange(event.target.value as PaymentFrequency);
      }}
    >
      {PAYMENT_FREQUENCIES.map((frequency) => (
        <MenuItem key={frequency} value={frequency}>
          {FREQUENCY_LABELS[frequency]}
        </MenuItem>
      ))}
    </TextField>
  );
};
