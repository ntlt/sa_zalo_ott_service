import { createBrowserRouter } from "react-router-dom";
// import Auth from "./auth/Auth";
import Login from "./auth/Login";
import Signup from "./auth/Signup";
// import Auth from "./auth/Auth";
import Dashboard from "./auth/Dashboard";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Dashboard />
    },
    {
        path: "/login",
        element: <Login />
    },
    {
        path: "/signup",
        element: <Signup />
    }
]);

export default router;