import React, { useCallback, useState } from "react";

import {
  Autocomplete,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography
} from "@mui/material";
import { NumericFormat } from "react-number-format";
import { v4 as uuid } from "uuid";

import DollarNumber from "./DollarNumber";

import { EXTRA_PAYMENT_STEP, STEP_TYPES, type Step } from "../constants/steps";
import {
  amortizedLoanPaymentAmount,
  amortizedLoanTotalAmount
} from "../utilities/loanCalc";

interface LoanCardProps {
  loanNumber: number;
}

const DEFAULT_ORIGINAL_AMOUNT = 100000;
const DEFAULT_ORIGINAL_TERM = 360;
const DEFAULT_ORIGINAL_RATE = 6;

const LoanCard: React.FC<LoanCardProps> = ({ loanNumber }) => {
  const [originalAmount, setOriginalAmount] = useState<number>(
    DEFAULT_ORIGINAL_AMOUNT
  );
  const [originalTerm, setOriginalTerm] = useState<number>(
    DEFAULT_ORIGINAL_TERM
  );
  const [originalRate, setOriginalRate] = useState<number>(
    DEFAULT_ORIGINAL_RATE
  );
  const [selectedStep, setSelectedStep] = useState<Step | null>(
    EXTRA_PAYMENT_STEP
  );
  const [steps, setSteps] = useState<Step[]>([]);

  const createStep = useCallback(() => {
    setSteps((currSteps) => {
      if (selectedStep !== null) {
        const newStep = { ...selectedStep, key: uuid() };
        currSteps.push(newStep);
      }
      return currSteps;
    });
  }, [selectedStep]);

  return (
    <Card style={{ minWidth: "600px" }}>
      <CardContent>
        <Grid container spacing={4} direction="column">
          <Grid size={12}>
            <Typography variant="h3">{`Loan ${loanNumber.toString()}`}</Typography>
            <hr />
          </Grid>
          <Grid container>
            <Grid size={4}>
              <NumericFormat
                value={originalAmount}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  setOriginalAmount(parseFloat(event.target.value));
                }}
                customInput={TextField}
                thousandSeparator
                valueIsNumericString
                prefix="$"
                label="Original Loan Amount"
                variant="outlined"
              />
            </Grid>
            <Grid size={4}>
              <TextField
                label="Original Loan Term (months)"
                variant="outlined"
                type="number"
                value={originalTerm}
                placeholder={DEFAULT_ORIGINAL_TERM.toString()}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  setOriginalTerm(parseFloat(event.target.value));
                }}
              />
            </Grid>
            <Grid size={4}>
              <TextField
                label="Original Loan Rate"
                variant="outlined"
                type="number"
                slotProps={{ htmlInput: { step: ".01" } }}
                value={originalRate}
                placeholder={DEFAULT_ORIGINAL_RATE.toString()}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  setOriginalRate(parseFloat(event.target.value));
                }}
              />
            </Grid>
          </Grid>
          <Grid container>
            <Grid container direction="column" spacing={1} size={4}>
              <Grid>
                <Typography variant="body1">Initial Monthly Payment</Typography>
              </Grid>
              <Grid>
                <Typography variant="body2">
                  <DollarNumber
                    value={amortizedLoanPaymentAmount(
                      originalAmount,
                      originalRate,
                      originalTerm
                    )}
                  />
                </Typography>
              </Grid>
            </Grid>
            <Grid container direction="column" spacing={1} size={4}>
              <Grid>
                <Typography variant="body1">Total Amount Paid</Typography>
              </Grid>
              <Grid>
                <Typography variant="body2">
                  <DollarNumber
                    value={
                      amortizedLoanTotalAmount(
                        originalAmount,
                        originalRate,
                        originalTerm
                      ).total
                    }
                  />
                </Typography>
              </Grid>
            </Grid>
            <Grid container direction="column" spacing={1} size={4}>
              <Grid>
                <Typography variant="body1">Total Interest Paid</Typography>
              </Grid>
              <Grid>
                <Typography variant="body2">
                  <DollarNumber
                    value={
                      amortizedLoanTotalAmount(
                        originalAmount,
                        originalRate,
                        originalTerm
                      ).interest
                    }
                  />
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid container size={12} justifyContent="center" alignItems="center">
            <Grid size={6}>
              <Autocomplete
                options={STEP_TYPES}
                value={selectedStep}
                onChange={(e, newValue) => {
                  setSelectedStep(newValue);
                }}
                renderInput={(params) => <TextField {...params} label="Step" />}
              />
            </Grid>
            <Grid size={3}>
              <Button variant="outlined" onClick={createStep}>
                Add Step
              </Button>
            </Grid>
          </Grid>
          <Grid size={12} container spacing={4} direction="column">
            {
              // ts-expect-error testing
              steps.map((step, index) => {
                console.log({ step, index });
                return React.createElement(step.component, {
                  index,
                  key: step.key
                });
              })
            }
          </Grid>
          <Grid container>
            <Grid size={4}>
              <Typography variant="h5">Total Amount Paid</Typography>
              <Typography variant="body1">$150,000</Typography>
            </Grid>
            <Grid size={4}>
              <Typography variant="h5">Total Interest Paid</Typography>
              <Typography variant="body1">$50,000</Typography>
            </Grid>
            <Grid size={4}>
              <Typography variant="h5">Loan Length</Typography>
              <Typography variant="body1">360 months</Typography>
            </Grid>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default LoanCard;
