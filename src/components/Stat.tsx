import { Box, Typography } from "@mui/material";

import type { Difference } from "../utilities/format";

interface StatProps {
  label: string;
  value: string;
  /** The baseline value, shown for comparison (7.6). */
  baseline?: string;
  difference?: Difference;
}

const TONE_COLORS: Record<Difference["tone"], string> = {
  good: "success.main",
  bad: "error.main",
  neutral: "text.secondary"
};

/** A labeled value with its comparison to the baseline. */
const Stat: React.FC<StatProps> = ({ label, value, baseline, difference }) => (
  <Box>
    <Typography variant="body2" color="text.secondary" component="dt">
      {label}
    </Typography>
    <Box component="dd" sx={{ m: 0 }}>
      <Typography variant="h6" component="span" sx={{ display: "block" }}>
        {value}
      </Typography>
      {baseline !== undefined && (
        <Typography variant="caption" color="text.secondary" component="span">
          Baseline {baseline}
          {difference && (
            <>
              {" · "}
              <Box
                component="span"
                sx={{ color: TONE_COLORS[difference.tone], fontWeight: 500 }}
              >
                {difference.text}
              </Box>
            </>
          )}
        </Typography>
      )}
    </Box>
  </Box>
);

export default Stat;
