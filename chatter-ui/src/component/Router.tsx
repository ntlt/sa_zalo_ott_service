import { createBrowserRouter } from "react-router-dom";
// import Auth from "./auth/Auth";
import Login from "./auth/Login";
import Signup from "./auth/Signup";

const router = createBrowserRouter([
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