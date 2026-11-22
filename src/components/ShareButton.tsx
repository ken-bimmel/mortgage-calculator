import { useState } from "react";

import ShareIcon from "@mui/icons-material/Share";
import { Alert, Button, Snackbar, Tooltip } from "@mui/material";

import type { AppState } from "../types";
import { buildShareUrl } from "../utilities/share";

type Toast = { kind: "success" } | { kind: "error" } | null;

/** Copies the shareable link to the clipboard (8.1). */
const ShareButton: React.FC<{ state: AppState }> = ({ state }) => {
  const [toast, setToast] = useState<Toast>(null);

  const copy = async () => {
    try {
      // navigator.clipboard is missing on insecure origins and older browsers
      if (typeof navigator.clipboard === "undefined") {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(
        buildShareUrl(state, window.location.href)
      );
      setToast({ kind: "success" });
    } catch {
      setToast({ kind: "error" });
    }
  };

  const close = (_?: unknown, reason?: string) => {
    if (reason !== "clickaway") setToast(null);
  };

  return (
    <>
      <Tooltip title="Copy shareable link">
        <Button
          color="inherit"
          variant="outlined"
          startIcon={<ShareIcon />}
          aria-label="Copy shareable link"
          onClick={() => {
            void copy();
          }}
        >
          Share
        </Button>
      </Tooltip>
      <Snackbar
        open={toast !== null}
        autoHideDuration={toast?.kind === "error" ? 10_000 : 3_000}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast?.kind === "error" ? (
          <Alert severity="error" variant="filled" onClose={close}>
            Failed to copy scenario URL
          </Alert>
        ) : (
          <Alert
            severity="success"
            variant="filled"
            onClose={close}
            role="status"
            aria-live="polite"
          >
            Copied scenario URL!
          </Alert>
        )}
      </Snackbar>
    </>
  );
};

export default ShareButton;
