import { useState } from "react";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import AnimatedSection from "../components/AnimatedSection";
import { api } from "../components/api";

export default function Register({ setUser }) {
  const [form, setForm] = useState({ username: "", displayName: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const data = await api("/api/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setUser(data.user);
      navigate("/settings");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AnimatedSection>
      <Paper elevation={0} sx={{ maxWidth: 620, mx: "auto", p: { xs: 3, md: 5 } }}>
        <Box component="form" onSubmit={submit}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h1" color="blog.subheading">Register</Typography>
              <Typography color="text.secondary">Make an account if you want to comment on my posts.</Typography>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Username" value={form.username} onChange={update("username")} required helperText="Letters, numbers, and underscores only." />
            <TextField label="Display name" value={form.displayName} onChange={update("displayName")} />
            <TextField label="Password" type="password" value={form.password} onChange={update("password")} required helperText="At least 8 characters." />
            <Button type="submit" variant="contained" size="large">Create my account</Button>
          </Stack>
        </Box>
      </Paper>
    </AnimatedSection>
  );
}
