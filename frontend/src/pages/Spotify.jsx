import { useEffect, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import { Alert, Box, Button, IconButton, Paper, Stack, TextField, Typography } from "@mui/material";
import AnimatedSection from "../components/AnimatedSection";
import { api } from "../components/api";
import { decodeDisplayText } from "../components/displayText";

const emptyPage = {
  title: "Spotify",
  playlists: [],
};

const emptyPlaylist = {
  label: "",
  playlistUrl: "",
};

export default function Spotify({ user }) {
  const [page, setPage] = useState(emptyPage);
  const [draft, setDraft] = useState(emptyPage);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const canEdit = user?.username === "runitrench";

  const normalisePage = (data) => {
    const playlists = Array.isArray(data.playlists)
      ? data.playlists
      : data.embedUrl
        ? [{ label: data.title || "Playlist 1", playlistUrl: data.playlistUrl || data.embedUrl, embedUrl: data.embedUrl }]
        : [];
    return { ...emptyPage, ...data, playlists };
  };

  const loadPage = async () => {
    setError("");
    try {
      const data = await api("/api/spotify");
      const next = normalisePage(data);
      setPage(next);
      setDraft(next);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const startEditing = () => {
    setStatus("");
    setError("");
    setDraft({
      ...page,
      playlists: page.playlists.length ? page.playlists : [{ ...emptyPlaylist, label: "Playlist 1" }],
    });
    setEditing(true);
  };

  const save = async () => {
    setStatus("");
    setError("");
    try {
      const data = await api("/api/spotify", {
        method: "PUT",
        body: JSON.stringify(draft),
      });
      const next = normalisePage(data);
      setPage(next);
      setDraft(next);
      setEditing(false);
      setStatus("Playlists saved.");
    } catch (err) {
      setError(err.message);
    }
  };

  const updatePlaylist = (index, field, value) => {
    setDraft((current) => ({
      ...current,
      playlists: current.playlists.map((playlist, playlistIndex) => (
        playlistIndex === index ? { ...playlist, [field]: value } : playlist
      )),
    }));
  };

  const addPlaylist = () => {
    setDraft((current) => ({
      ...current,
      playlists: [...current.playlists, { ...emptyPlaylist, label: `Playlist ${current.playlists.length + 1}` }],
    }));
  };

  const removePlaylist = (index) => {
    setDraft((current) => ({
      ...current,
      playlists: current.playlists.filter((_, playlistIndex) => playlistIndex !== index),
    }));
  };

  return (
    <Stack spacing={4}>
      <AnimatedSection>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-end" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h1" color="blog.subheading">{decodeDisplayText(page.title || "Spotify")}</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 760 }}>
              A place for me to keep my playlist close by and play previews while I am on the site.
            </Typography>
          </Box>
          {canEdit && (
            <Button
              variant={editing ? "outlined" : "contained"}
              startIcon={editing ? <CloseIcon /> : <EditIcon />}
              onClick={() => (editing ? setEditing(false) : startEditing())}
            >
              {editing ? "Cancel" : "Edit playlist"}
            </Button>
          )}
        </Stack>
      </AnimatedSection>

      {error && <Alert severity="error">{error}</Alert>}
      {status && <Alert severity="success">{status}</Alert>}

      {canEdit && editing && (
        <AnimatedSection delay={60}>
          <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Stack spacing={2.5}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} justifyContent="space-between">
                <Typography variant="h2">Choose playlists</Typography>
                <Button startIcon={<AddIcon />} onClick={addPlaylist}>Add playlist</Button>
              </Stack>
              <TextField
                label="Page title"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
              <Stack spacing={2}>
                {draft.playlists.map((playlist, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 2, boxShadow: "none" }}>
                    <Stack spacing={1.5}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                        <TextField
                          label="Playlist label"
                          value={playlist.label}
                          onChange={(event) => updatePlaylist(index, "label", event.target.value)}
                          fullWidth
                        />
                        <IconButton onClick={() => removePlaylist(index)} aria-label="Remove playlist">
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                      <TextField
                        label="Spotify playlist link or embed code"
                        value={playlist.playlistUrl || playlist.embedUrl || ""}
                        onChange={(event) => updatePlaylist(index, "playlistUrl", event.target.value)}
                        multiline
                        minRows={2}
                        placeholder="https://open.spotify.com/playlist/..."
                      />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={save}>
                  Save playlists
                </Button>
              </Box>
            </Stack>
          </Paper>
        </AnimatedSection>
      )}

      <AnimatedSection delay={100}>
        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, overflow: "hidden" }}>
          {page.playlists.length ? (
            <Stack spacing={4}>
              {page.playlists.map((playlist) => (
                <Stack key={playlist.embedUrl} spacing={1.5}>
                  <Typography variant="h2" color="blog.subheading">{decodeDisplayText(playlist.label)}</Typography>
                  <Box
                    component="iframe"
                    title={`${decodeDisplayText(playlist.label)} Spotify playlist`}
                    src={playlist.embedUrl}
                    sx={{
                      display: "block",
                      width: "100%",
                      height: { xs: 520, md: 680 },
                      border: 0,
                      borderRadius: 2,
                    }}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                </Stack>
              ))}
            </Stack>
          ) : (
            <Stack spacing={2} alignItems="flex-start" sx={{ py: 4 }}>
              <MusicNoteIcon color="secondary" />
              <Typography variant="h2">No playlist yet.</Typography>
              {canEdit && <Typography color="text.secondary">Paste Spotify playlist links to show them here.</Typography>}
            </Stack>
          )}
        </Paper>
      </AnimatedSection>
    </Stack>
  );
}
