import { useCallback, useMemo, useState } from "react";

import {
  AppBar,
  Box,
  Container,
  CssBaseline,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme
} from "@mui/material";

import LoanDefinitionCard from "./components/LoanDefinitionCard";
import ShareButton from "./components/ShareButton";
import Timeline from "./components/Timeline";
import type { AppState } from "./types";
import { calculate } from "./utilities/calculate";
import { loadFromUrl } from "./utilities/share";

// Dark mode only (8.4)
const theme = createTheme({
  palette: { mode: "dark" },
  shape: { borderRadius: 8 }
});

/** Reads a shared link once, removing invalid data from the address bar (2.2). */
const loadInitialState = (): AppState => {
  const { state, url } = loadFromUrl(window.location.href);
  if (url !== window.location.href) {
    window.history.replaceState(window.history.state, "", url);
  }
  return state;
};

function App() {
  const [state, setState] = useState<AppState>(loadInitialState);
  const [announcement, setAnnouncement] = useState("");
  const calculation = useMemo(() => calculate(state), [state]);

  const announce = useCallback((message: string) => {
    setAnnouncement(message);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar sx={{ gap: 2, maxWidth: 1200, width: "100%", mx: "auto" }}>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            Mortgage Calculator
          </Typography>
          <ShareButton state={state} />
        </Toolbar>
      </AppBar>
      <Container
        component="main"
        maxWidth={false}
        sx={{ maxWidth: 1200, py: 3, display: "grid", gap: 4 }}
      >
        <LoanDefinitionCard
          loan={state.loan}
          baseline={calculation.baseline}
          onChange={(loan) => {
            setState((current) => ({ ...current, loan }));
          }}
        />
        <Timeline
          state={state}
          calculation={calculation}
          announce={announce}
          onEventsChange={(events) => {
            setState((current) => ({ ...current, events }));
          }}
        />
      </Container>
      <Box
        role="status"
        aria-live="polite"
        sx={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap"
        }}
      >
        {announcement}
      </Box>
    </ThemeProvider>
  );
}

export default App;
