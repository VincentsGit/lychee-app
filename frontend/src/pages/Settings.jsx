import { useEffect, useState } from "react";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import AnimatedSection from "../components/AnimatedSection";
import UserAvatar from "../components/UserAvatar";
import { api } from "../components/api";

export default function Settings({ user, refreshUser }) {
  const [form, setForm] = useState({ displayName: "", aboutMe: "", avatarUrl: "" });
  const [deletePassword, setDeletePassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (user === null) navigate("/login");
    if (user) {
      setForm({
        displayName: user.displayName || "",
        aboutMe: user.aboutMe || "",
        avatarUrl: user.avatarUrl || "",
      });
    }
  }, [user, navigate]);

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    try {
      const data = await api("/api/upload", { method: "POST", body });
      setForm((prev) => ({ ...prev, avatarUrl: data.url }));
    } catch (err) {
      setError(err.message);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");
    try {
      await api("/api/settings", { method: "PUT", body: JSON.stringify(form) });
      await refreshUser();
      setStatus("Settings saved.");
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteAccount = async () => {
    setDeleteError("");
    if (!deletePassword) {
      setDeleteError("Type your password first.");
      return;
    }
    if (!window.confirm("Delete your account? This will remove your comments too.")) return;

    try {
      await api("/api/settings/delete-account", {
        method: "DELETE",
        body: JSON.stringify({ password: deletePassword }),
      });
      await refreshUser();
      navigate("/");
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  if (!user) return null;

  return (
    <AnimatedSection>
      <Paper elevation={0} sx={{ maxWidth: 760, mx: "auto", p: { xs: 3, md: 5 } }}>
        <Box component="form" onSubmit={submit}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h1" color="blog.subheading">Settings</Typography>
              <Typography color="text.secondary">Change your picture and what people see on your profile.</Typography>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
            {status && <Alert severity="success">{status}</Alert>}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ sm: "center" }}>
              <UserAvatar user={{ ...user, avatarUrl: form.avatarUrl, displayName: form.displayName }} size={92} />
              <Button variant="outlined" component="label">
                Upload avatar
                <input type="file" accept="image/*" hidden onChange={uploadAvatar} />
              </Button>
            </Stack>
            <TextField label="Display name" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
            <TextField
              label="About me"
              value={form.aboutMe}
              onChange={(event) => setForm({ ...form, aboutMe: event.target.value })}
              multiline
              minRows={5}
              inputProps={{ maxLength: 1000 }}
            />
            <Button type="submit" variant="contained" size="large">Save settings</Button>
          </Stack>
        </Box>
      </Paper>
      {user.username !== "runitrench" && (
        <Paper elevation={0} sx={{ maxWidth: 760, mx: "auto", mt: 3, p: { xs: 3, md: 4 }, borderColor: "error.main" }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h2" color="error.main">Delete account</Typography>
              <Typography color="text.secondary">
                This deletes your account and your comments. Type your password to confirm.
              </Typography>
            </Box>
            {deleteError && <Alert severity="error">{deleteError}</Alert>}
            <TextField
              label="Password"
              type="password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
            />
            <Box>
              <Button color="error" variant="contained" onClick={deleteAccount}>
                Delete my account
              </Button>
            </Box>
          </Stack>
        </Paper>
      )}
    </AnimatedSection>
  );
}
