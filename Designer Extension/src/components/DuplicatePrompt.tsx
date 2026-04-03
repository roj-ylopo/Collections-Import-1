import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import { DuplicateStrategy } from "../types/index";

interface DuplicatePromptProps {
  open: boolean;
  duplicateCount: number;
  onChoice: (strategy: DuplicateStrategy) => void;
  onCancel: () => void;
}

const DuplicatePrompt: React.FC<DuplicatePromptProps> = ({
  open,
  duplicateCount,
  onChoice,
  onCancel,
}) => {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: "1rem", pb: 0.5 }}>
        Duplicate Items Detected
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ fontSize: "0.9rem" }}>
          {duplicateCount} item{duplicateCount !== 1 ? "s" : ""} already exist in this
          collection. How should we handle them?
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ flexDirection: "column", gap: 1, p: 2, pt: 0 }}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={() => onChoice("skip")}
        >
          Skip duplicates
        </Button>
        <Button
          fullWidth
          variant="outlined"
          color="primary"
          onClick={() => onChoice("overwrite")}
        >
          Overwrite existing
        </Button>
        <Button
          fullWidth
          variant="outlined"
          color="primary"
          onClick={() => onChoice("add")}
        >
          Add anyway
        </Button>
        <Button fullWidth onClick={onCancel} color="inherit" sx={{ mt: 0.5 }}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DuplicatePrompt;
