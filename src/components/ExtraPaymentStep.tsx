import { Card, CardContent, Grid, Typography } from "@mui/material";

import { EXTRA_PAYMENT_STEP, type StepProps } from "../constants/steps";

interface ExtraPaymentStepProps extends StepProps {
  index: number;
}

const ExtraPaymentStep: React.FC<ExtraPaymentStepProps> = ({ index }) => {
  return (
    <Grid size={12}>
      <Card>
        <CardContent>
          <Typography variant="h3">{EXTRA_PAYMENT_STEP.label}</Typography>
          Index: {index}
        </CardContent>
      </Card>
    </Grid>
  );
};

export default ExtraPaymentStep;
