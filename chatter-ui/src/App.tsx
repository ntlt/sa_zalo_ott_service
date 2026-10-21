import { ThemeProvider, createTheme, CssBaseline, Container } from "@mui/material";
// import Auth from "./component/auth/Auth";
// import { Router } from "react-router-dom";
import { RouterProvider } from "react-router-dom";
import router from "./component/Router";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

const App = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container>
        <RouterProvider router={router} />
      </Container>
    </ThemeProvider>
  );
};

export default App;