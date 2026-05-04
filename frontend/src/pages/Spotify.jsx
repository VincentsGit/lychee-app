import { useEffect, useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import { Alert, Box, Button, Link, Paper, Stack, TextField, Typography } from "@mui/material";
import AnimatedSection from "../components/AnimatedSection";
import { api } from "../components/api";
import { decodeDisplayText } from "../components/displayText";

const emptyPage = {
  title: "Spotify",
  playlistUrl: "",
  embedUrl: "",
};

export default function Spotify({ user }) {
  const [page, setPage] = useState(emptyPage);
  const [draft, setDraft] = useState(emptyPage);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const canEdit = user?.username === "runitrench";

  const loadPage = async () => {
    setError("");
    try {
      const data = await api("/api/spotify");
      setPage({ ...emptyPage, ...data });
      setDraft({ ...emptyPage, ...data, playlistUrl: data.playlistUrl || data.embedUrl || "" });
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
    setDraft({ ...page, playlistUrl: page.playlistUrl || page.embedUrl || "" });
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
      setPage({ ...emptyPage, ...data });
      setDraft({ ...emptyPage, ...data, playlistUrl: data.playlistUrl || "" });
      setEditing(false);
      setStatus("Playlist saved.");
    } catch (err) {
      setError(err.message);
    }
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
              onClick={() => setEditing((current) => !current)}
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
              <Typography variant="h2">Choose playlist</Typography>
              <TextField
                label="Page title"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
              <TextField
                label="Spotify playlist link or embed code"
                value={draft.playlistUrl}
                onChange={(event) => setDraft({ ...draft, playlistUrl: event.target.value })}
                multiline
                minRows={3}
                placeholder="https://open.spotify.com/playlist/..."
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={save}>
                  Save playlist
                </Button>
              </Box>
            </Stack>
          </Paper>
        </AnimatedSection>
      )}

      <AnimatedSection delay={100}>
        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, overflow: "hidden" }}>
          {page.embedUrl ? (
            <Stack spacing={2}>
              <Box
                component="iframe"
                title={`${decodeDisplayText(page.title || "Spotify")} playlist`}
                src={page.embedUrl}
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
              <Link href={page.playlistUrl} target="_blank" rel="noopener noreferrer" sx={{ alignSelf: "flex-start" }}>
                Open playlist on Spotify
              </Link>
            </Stack>
          ) : (
            <Stack spacing={2} alignItems="flex-start" sx={{ py: 4 }}>
              <MusicNoteIcon color="secondary" />
              <Typography variant="h2">No playlist yet.</Typography>
              {canEdit && <Typography color="text.secondary">Paste a Spotify playlist link to show it here.</Typography>}
            </Stack>
          )}
        </Paper>
      </AnimatedSection>
    </Stack>
  );
}
