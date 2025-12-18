import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Alert,
} from "@mui/material";
import { useNavigate } from 'react-router-dom';

export default function Login({ setIsLoggedIn, setUserId }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5000/me", { credentials: "include" })
      .then(res => res.ok && navigate("/"));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please fill in both fields.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        credentials: "include", // ✅ important for cookies
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed.");
        return;
      }

      navigate("/");
      setIsLoggedIn(true);
      setUserId(data.user_id);

    } catch (err) {
      console.log(err)
      setError("Network error. Please try again.");
    }
  };

  return (
    <Container sx={{ mt: { xs: 0, md: 4 } }}>
      <Typography variant="h2" color="blog.subheading">Login</Typography>

      <Typography variant="body1" sx={{ mt: 4 }}>
        Page for me to login.
      </Typography>

      <Typography variant="body1" sx={{ mt: 2 }}>
        You won't be able to login, only I can. (For now at least.)
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          mt: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <TextField
          margin="normal"
          required
          fullWidth
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3 }}
        >
          Login
        </Button>
        {error && (
          <Alert severity="error" sx={{ width: "100%", mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>

    </Container>
  );
}
