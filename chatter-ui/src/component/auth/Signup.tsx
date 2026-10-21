import { Link } from "react-router-dom";
import { Link as MuiLink } from "@mui/material";
import Auth from "./Auth";

const Signup = () => {
    return <Auth submitLable="Signup" onSubmit={async () => Promise.resolve()} >
        <Link to={"/login"} style ={{ textDecoration: "none" , alignSelf: "center", marginTop: "10px"}}>
            <MuiLink component="span" variant="body2">
                Already have an account? Login
            </MuiLink>
        </Link>
    </Auth>;
};

export default Signup;