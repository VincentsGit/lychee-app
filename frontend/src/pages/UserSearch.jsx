import { useEffect, useMemo, useState } from "react";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SearchIcon from "@mui/icons-material/Search";
import { Link as RouterLink } from "react-router-dom";
import { Alert, Box, Button, Chip, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import AnimatedSection from "../components/AnimatedSection";
import { api } from "../components/api";
import { decodeDisplayText } from "../components/displayText";
import UserAvatar from "../components/UserAvatar";

function cleanHandle(value) {
  return String(value || "").trim().replace(/^@+/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 24);
}

export default function UserSearch() {
  const [handle, setHandle] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const username = useMemo(() => cleanHandle(handle), [handle]);

  useEffect(() => {
    setError("");
    if (!username) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      api(`/api/users/search?username=${encodeURIComponent(username)}`, { signal: controller.signal })
        .then((data) => {
          setResults(data.users || []);
          setSearched(true);
        })
        .catch((err) => {
          if (err.name !== "AbortError") setError(err.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [username]);

  return (
    <Stack spacing={4}>
      <AnimatedSection>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, overflow: "hidden", position: "relative" }}>
          <Box
            sx={{
              position: "absolute",
              inset: "auto -80px -120px auto",
              width: 260,
              height: 260,
              borderRadius: "50%",
              bgcolor: "rgba(255, 204, 131, 0.10)",
              filter: "blur(4px)",
            }}
          />
          <Stack spacing={2.5} sx={{ position: "relative" }}>
            <Chip icon={<AlternateEmailIcon />} label="find people" color="primary" sx={{ alignSelf: "flex-start" }} />
            <Box>
              <Typography variant="h1" color="blog.subheading">Find users</Typography>
              <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
                Search existing accounts by their @username and jump straight to their profile.
              </Typography>
            </Box>
            <TextField
              label="Search by @username"
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              placeholder="@runitrench"
              autoComplete="off"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="secondary" />
                  </InputAdornment>
                ),
              }}
              helperText={username ? `Looking for @${username}` : "Type someone's @ handle to find them."}
            />
          </Stack>
        </Paper>
      </AnimatedSection>

      {error && <Alert severity="error">{error}</Alert>}

      <AnimatedSection delay={80}>
        <Stack spacing={2}>
          {loading && <Typography color="text.secondary">Searching...</Typography>}
          {!loading && !username && (
            <Typography color="text.secondary">No search yet.</Typography>
          )}
          {!loading && username && searched && results.length === 0 && (
            <Paper elevation={0} sx={{ p: 3 }}>
              <Typography variant="h3" color="blog.subheading">No matching users</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>Nobody matched @{username}.</Typography>
            </Paper>
          )}
          {results.map((person) => (
            <Paper key={person.id} elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderTop: "3px solid", borderTopColor: "secondary.main" }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ sm: "center" }}>
                <UserAvatar user={person} size={64} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h3">{decodeDisplayText(person.displayName)}</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                    <Chip label={`@${person.username}`} color="primary" variant="outlined" />
                    <Chip label={`Joined ${new Date(person.createdAt).toLocaleDateString()}`} variant="outlined" />
                  </Stack>
                </Box>
                <Button component={RouterLink} to={`/users/${person.id}`} variant="contained" color="secondary" endIcon={<ArrowForwardIcon />}>
                  View profile
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </AnimatedSection>
    </Stack>
  );
}
