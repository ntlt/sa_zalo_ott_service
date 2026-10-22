import { Button, Stack, TextField } from "@mui/material";
import React from "react";

interface AppProps {
  submitLable: string;
  onSubmit: (credential: { username: string; password: string }) => Promise<void>;
  children: React.ReactNode;
}

const Auth = ({ submitLable, onSubmit, children }: AppProps) => {
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');

    return (
        <Stack
            spacing={3}
            sx={{
                width: "300px",
                maxWidth: "100%",
                margin: "0 auto",
                marginTop: "100px",
                justifyContent: "center",
                alignItems: "center"
            }}>
            <TextField
                label="Username"
                variant="outlined"
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
                label="Password"
                type="password"
                variant="outlined"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <Button variant="contained" color="primary" fullWidth onClick={() => onSubmit({ username, password })}>
                {submitLable}
            </Button>
            {children}
        </Stack>
    );
};

export default Auth;
