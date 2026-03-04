import { Card, CardContent, Grid, Typography } from "@mui/material";

import { PAYMENT_FREQUENCY_STEP } from "../constants/steps";

interface PaymentFrequencyStepProps {
  index: number;
}

const PaymentFrequencyStep: React.FC<PaymentFrequencyStepProps> = ({
  index
}) => {
  return (
    <Grid size={12}>
      <Card>
        <CardContent>
          <Typography variant="h3">{PAYMENT_FREQUENCY_STEP.label}</Typography>
          Index: {index}
        </CardContent>
      </Card>
    </Grid>
  );
};

export default PaymentFrequencyStep;
