import { createTheme } from "@mui/material";

// BRAND_COLOR — change this one value to retheme the entire app.
// Also update --brand-color in importPanel.css to match.
export const BRAND_COLOR = "#2e7d32";

const theme = createTheme({
  palette: {
    primary: {
      main: BRAND_COLOR,
    },
  },
  typography: {
    fontSize: 9,
    body1: {
      fontSize: "1rem",
      lineHeight: 1.5,
    },
  },
});

export default theme;
