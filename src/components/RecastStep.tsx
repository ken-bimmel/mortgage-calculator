import { Card, CardContent, Grid, Typography } from "@mui/material";

import { RECAST_STEP } from "../constants/steps";

interface RecastStepProps {
  index: number;
}

const RecastStep: React.FC<RecastStepProps> = ({ index }) => {
  return (
    <Grid size={12}>
      <Card>
        <CardContent>
          <Typography variant="h3">{RECAST_STEP.label}</Typography>
          Index: {index}
        </CardContent>
      </Card>
    </Grid>
  );
};

export default RecastStep;
