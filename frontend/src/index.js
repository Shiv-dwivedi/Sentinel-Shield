import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import App from "./App";

const theme = createTheme(); // MUI Theme

ReactDOM.createRoot(document.getElementById("root")).render(
  // <React.StrictMode>
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  // {/* </React.StrictMode> */}
);
