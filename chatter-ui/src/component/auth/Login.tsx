import { Link } from "react-router-dom";
import { Link as MuiLink } from "@mui/material";
import Auth from "./Auth";

const Login = () => {
    return <Auth submitLable="Login" onSubmit={async () => Promise.resolve()} >
        <Link to={"/signup"} style ={{ textDecoration: "none" , alignSelf: "center", marginTop: "10px"}}>
            <MuiLink component="span" variant="body2">
                Don't have an account? Sign Up
            </MuiLink>
        </Link>
    </Auth>;
};

export default Login;