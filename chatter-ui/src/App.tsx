import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { RouterProvider } from "react-router-dom";
import router from "./component/Router";

const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0866ff" },
    background: { default: "#f4f6f9", paper: "#ffffff" },
  },
  typography: {
    fontFamily: '"Roboto", "Arial", sans-serif',
  },
});

const App = () => {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
};

export default App;