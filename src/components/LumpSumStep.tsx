import { Card, CardContent, Grid, Typography } from "@mui/material";

import { LUMP_SUM_STEP } from "../constants/steps";

interface LumpSumStepProps {
  index: number;
}

const LumpSumStep: React.FC<LumpSumStepProps> = ({ index }) => {
  return (
    <Grid size={12}>
      <Card>
        <CardContent>
          <Typography variant="h3">{LUMP_SUM_STEP.label}</Typography>
          Index: {index}
        </CardContent>
      </Card>
    </Grid>
  );
};

export default LumpSumStep;
