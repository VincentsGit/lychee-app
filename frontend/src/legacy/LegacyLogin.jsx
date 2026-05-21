import { useState } from "react";
import { Alert, Box, Button, Container, TextField, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { api } from "../components/api";

export default function LegacyLogin({ setUser }) {
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
    <Container sx={{ mt: { xs: 0, md: 4 }, maxWidth: 560 }}>
      <Typography variant="h2" color="blog.subheading">Login</Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4, display: "grid", gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Username" value={username} onChange={(event) => setUsername(event.target.value)} required />
        <TextField label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <Button type="submit" variant="contained">Login</Button>
      </Box>
    </Container>
  );
}
