import { Card, CardContent, Grid, Typography } from "@mui/material";

import { REFINANCE_STEP } from "../constants/steps";

interface RefinanceStepProps {
  index: number;
}

const RefinanceStep: React.FC<RefinanceStepProps> = ({ index }) => {
  return (
    <Grid size={12}>
      <Card>
        <CardContent>
          <Typography variant="h3">{REFINANCE_STEP.label}</Typography>
          Index: {index}
        </CardContent>
      </Card>
    </Grid>
  );
};

export default RefinanceStep;
