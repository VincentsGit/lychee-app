import { useState } from "react";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import AnimatedSection from "../components/AnimatedSection";
import { api } from "../components/api";

export default function Login({ setUser }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const data = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setUser(data.user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AnimatedSection>
      <Paper elevation={0} sx={{ maxWidth: 560, mx: "auto", p: { xs: 3, md: 5 } }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h1" color="blog.subheading">Login</Typography>
              <Typography color="text.secondary">Welcome back!</Typography>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Username" value={username} onChange={(event) => setUsername(event.target.value)} required />
            <TextField label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <Button type="submit" variant="contained" size="large">Login</Button>
            <Typography color="text.secondary">
              New here? <Button component={RouterLink} to="/register">Create an account</Button>
            </Typography>
          </Stack>
        </Box>
      </Paper>
    </AnimatedSection>
  );
}
