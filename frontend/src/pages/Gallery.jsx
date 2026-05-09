import { useEffect, useMemo, useRef, useState } from "react";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import SaveIcon from "@mui/icons-material/Save";
import { Alert, Box, Button, Chip, IconButton, Paper, Stack, TextField, Typography } from "@mui/material";
import AnimatedSection from "../components/AnimatedSection";
import { api } from "../components/api";
import { decodeDisplayText } from "../components/displayText";

const emptyDraft = { caption: "", file: null };

function PhotoCard({ photo, canEdit, onEdit, onDelete }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.4,
        height: "100%",
        borderRadius: 4,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "rgba(255, 204, 131, 0.26)",
        boxShadow: "0 22px 58px rgba(0, 0, 0, 0.22)",
      }}
    >
      <Stack spacing={1.5} sx={{ height: "100%" }}>
        <Box
          sx={{
            p: 1,
            bgcolor: "rgba(255, 255, 255, 0.88)",
            borderRadius: 3,
            boxShadow: "inset 0 0 0 1px rgba(44, 39, 56, 0.08)",
          }}
        >
          <Box
            component="img"
            src={photo.imageUrl}
            alt={decodeDisplayText(photo.caption) || "Gallery photo"}
            loading="lazy"
            sx={{
              display: "block",
              width: "100%",
              aspectRatio: "4 / 5",
              objectFit: "cover",
              borderRadius: 2,
              bgcolor: "background.default",
            }}
          />
        </Box>
        <Box sx={{ px: 0.75, pb: 0.4, flex: 1 }}>
          {photo.caption ? (
            <Typography color="text.secondary" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
              {decodeDisplayText(photo.caption)}
            </Typography>
          ) : (
            <Typography color="text.secondary" sx={{ opacity: 0.62, fontStyle: "italic" }}>
              No caption yet.
            </Typography>
          )}
        </Box>
        {canEdit && (
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <IconButton onClick={() => onEdit(photo)} aria-label="Edit caption"><EditIcon /></IconButton>
            <IconButton onClick={() => onDelete(photo)} aria-label="Delete photo" color="error"><DeleteIcon /></IconButton>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

export default function Gallery({ user }) {
  const canEdit = user?.username === "runitrench";
  const [photos, setPhotos] = useState([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [editing, setEditing] = useState(null);
  const [editCaption, setEditCaption] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const selectedName = useMemo(() => draft.file?.name || "", [draft.file]);

  const loadPhotos = () => {
    api("/api/gallery")
      .then(setPhotos)
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  const submitPhoto = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");
    if (!draft.file) {
      setError("Choose a photo first.");
      return;
    }
    const body = new FormData();
    body.append("file", draft.file);
    body.append("caption", draft.caption);
    setSaving(true);
    try {
      const photo = await api("/api/gallery", { method: "POST", body });
      setPhotos((current) => [photo, ...current]);
      setDraft(emptyDraft);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setStatus("Photo posted.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveCaption = async () => {
    if (!editing) return;
    setError("");
    setStatus("");
    try {
      const photo = await api(`/api/gallery/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({ caption: editCaption }),
      });
      setPhotos((current) => current.map((item) => (item.id === photo.id ? photo : item)));
      setEditing(null);
      setEditCaption("");
      setStatus("Caption saved.");
    } catch (err) {
      setError(err.message);
    }
  };

  const deletePhoto = async (photo) => {
    if (!window.confirm("Delete this photo from the gallery?")) return;
    setError("");
    setStatus("");
    try {
      await api(`/api/gallery/${photo.id}`, { method: "DELETE" });
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      setStatus("Photo deleted.");
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (photo) => {
    setEditing(photo);
    setEditCaption(photo.caption || "");
    setStatus("");
    setError("");
  };

  return (
    <Stack spacing={4.5}>
      <AnimatedSection>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, overflow: "hidden", position: "relative" }}>
          <Box
            sx={{
              position: "absolute",
              inset: "-120px -80px auto auto",
              width: 270,
              height: 270,
              borderRadius: "50%",
              bgcolor: "rgba(255, 204, 131, 0.10)",
            }}
          />
          <Stack spacing={2.4} sx={{ position: "relative" }}>
            <Chip icon={<PhotoLibraryIcon />} label="photo gallery" color="primary" sx={{ alignSelf: "flex-start" }} />
            <Box>
              <Typography variant="h1" color="blog.subheading">Gallery</Typography>
              <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
                A little wall of photos, memories, and optional captions.
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </AnimatedSection>

      {canEdit && (
        <AnimatedSection delay={60}>
          <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, borderTop: "3px solid", borderTopColor: "secondary.main" }}>
            <Box component="form" onSubmit={submitPhoto}>
              <Stack spacing={2.2}>
                <Box>
                  <Typography variant="h2" color="blog.subheading">Post a photo</Typography>
                  <Typography color="text.secondary">Upload a photo and add a short caption if you feel like it.</Typography>
                </Box>
                {error && <Alert severity="error">{error}</Alert>}
                {status && <Alert severity="success">{status}</Alert>}
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                  <Button variant="outlined" component="label" startIcon={<AddPhotoAlternateIcon />} sx={{ flexShrink: 0 }}>
                    Choose photo
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.heic,.heics"
                      hidden
                      onChange={(event) => setDraft((current) => ({ ...current, file: event.target.files?.[0] || null }))}
                    />
                  </Button>
                  <Typography color={selectedName ? "text.primary" : "text.secondary"} sx={{ flex: 1 }}>
                    {selectedName || "No photo selected yet."}
                  </Typography>
                </Stack>
                <TextField
                  label="Caption (optional)"
                  value={draft.caption}
                  onChange={(event) => setDraft((current) => ({ ...current, caption: event.target.value }))}
                  multiline
                  minRows={2}
                  inputProps={{ maxLength: 500 }}
                  helperText="Optional — leave it blank if the photo speaks for itself."
                />
                <Box>
                  <Button type="submit" variant="contained" color="secondary" disabled={saving} startIcon={<AutoAwesomeIcon />}>
                    {saving ? "Posting..." : "Post photo"}
                  </Button>
                </Box>
              </Stack>
            </Box>
          </Paper>
        </AnimatedSection>
      )}

      {!canEdit && (error || status) && (
        <>{error && <Alert severity="error">{error}</Alert>}{status && <Alert severity="success">{status}</Alert>}</>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
          gap: { xs: 2.4, md: 3 },
          alignItems: "stretch",
        }}
      >
        {photos.map((photo, index) => (
          <AnimatedSection key={photo.id} delay={80 + (index % 8) * 45} sx={{ height: "100%" }}>
            <PhotoCard photo={photo} canEdit={canEdit} onEdit={startEdit} onDelete={deletePhoto} />
          </AnimatedSection>
        ))}
      </Box>

      {photos.length === 0 && (
        <AnimatedSection delay={120}>
          <Paper elevation={0} sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h2" color="blog.subheading">No photos yet</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>The gallery is ready for Runi's first upload.</Typography>
          </Paper>
        </AnimatedSection>
      )}

      {editing && (
        <Paper
          elevation={0}
          sx={{
            position: "fixed",
            inset: { xs: "auto 12px 12px", sm: "auto 24px 24px auto" },
            width: { xs: "auto", sm: 420 },
            p: 2.5,
            zIndex: (theme) => theme.zIndex.modal,
            borderTop: "3px solid",
            borderTopColor: "secondary.main",
          }}
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Typography variant="h3" color="blog.subheading">Edit caption</Typography>
              <IconButton onClick={() => setEditing(null)} aria-label="Close caption editor"><CloseIcon /></IconButton>
            </Stack>
            <TextField
              label="Caption"
              value={editCaption}
              onChange={(event) => setEditCaption(event.target.value)}
              multiline
              minRows={3}
              inputProps={{ maxLength: 500 }}
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={saveCaption}>Save</Button>
            </Stack>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
