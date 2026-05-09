import { useEffect, useMemo, useRef, useState } from "react";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import SaveIcon from "@mui/icons-material/Save";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Stack, TextField, Typography } from "@mui/material";
import AnimatedSection from "../components/AnimatedSection";
import { api } from "../components/api";
import { decodeDisplayText } from "../components/displayText";

const emptyDraft = { caption: "", file: null };

function PhotoCard({ photo, canEdit, onEdit, onDelete, onOpen }) {
  const caption = decodeDisplayText(photo.caption || "");
  const openPhoto = () => onOpen(photo);

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={openPhoto}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPhoto();
        }
      }}
      aria-label={caption ? `Open photo: ${caption}` : "Open gallery photo"}
      sx={{
        position: "relative",
        display: "block",
        width: "100%",
        aspectRatio: "1 / 1",
        border: "1px solid",
        borderColor: "rgba(205, 180, 255, 0.18)",
        borderRadius: { xs: 1.2, sm: 1.8 },
        overflow: "hidden",
        bgcolor: "rgba(255, 255, 255, 0.04)",
        cursor: "pointer",
        boxShadow: "none",
        lineHeight: 0,
        transition: "transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
        "&:hover, &:focus-visible": {
          transform: "translateY(-2px)",
          borderColor: "rgba(255, 204, 131, 0.72)",
          boxShadow: "0 16px 42px rgba(0, 0, 0, 0.22)",
          outline: "none",
        },
        "&:hover .gallery-caption-overlay, &:focus-visible .gallery-caption-overlay": {
          opacity: 1,
        },
      }}
    >
      <Box
        component="img"
        src={photo.imageUrl}
        alt={caption || "Gallery photo"}
        loading="lazy"
        sx={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          bgcolor: "background.default",
        }}
      />

      {caption && (
        <Box
          className="gallery-caption-overlay"
          sx={{
            position: "absolute",
            inset: "auto 0 0",
            p: { xs: 0.75, sm: 1 },
            background: "linear-gradient(180deg, transparent, rgba(10, 8, 18, 0.84))",
            opacity: { xs: 1, md: 0 },
            transition: "opacity 180ms ease",
            lineHeight: 1.2,
            textAlign: "left",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "#fff7ec",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textShadow: "0 1px 8px rgba(0, 0, 0, 0.5)",
            }}
          >
            {caption}
          </Typography>
        </Box>
      )}

      {canEdit && (
        <Stack
          direction="row"
          spacing={0.5}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          sx={{
            position: "absolute",
            top: { xs: 4, sm: 6 },
            right: { xs: 4, sm: 6 },
            p: 0.35,
            borderRadius: 999,
            bgcolor: "rgba(23, 19, 38, 0.78)",
            backdropFilter: "blur(8px)",
            lineHeight: 1,
          }}
        >
          <IconButton size="small" onClick={() => onEdit(photo)} aria-label="Edit caption" sx={{ color: "#fff7ec" }}>
            <EditIcon fontSize="inherit" />
          </IconButton>
          <IconButton size="small" onClick={() => onDelete(photo)} aria-label="Delete photo" sx={{ color: "#ffb4a2" }}>
            <DeleteIcon fontSize="inherit" />
          </IconButton>
        </Stack>
      )}
    </Box>
  );
}

export default function Gallery({ user }) {
  const canEdit = user?.username === "runitrench";
  const [photos, setPhotos] = useState([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [editing, setEditing] = useState(null);
  const [activePhoto, setActivePhoto] = useState(null);
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
      setActivePhoto((current) => (current?.id === photo.id ? null : current));
      if (editing?.id === photo.id) setEditing(null);
      setStatus("Photo deleted.");
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (photo) => {
    setActivePhoto(null);
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
          width: "100%",
          maxWidth: { xs: "100%", md: 980 },
          mx: "auto",
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: { xs: 0.55, sm: 0.85, md: 1.15 },
          alignItems: "stretch",
        }}
      >
        {photos.map((photo, index) => (
          <AnimatedSection key={photo.id} delay={80 + (index % 9) * 28} sx={{ minWidth: 0 }}>
            <PhotoCard photo={photo} canEdit={canEdit} onEdit={startEdit} onDelete={deletePhoto} onOpen={setActivePhoto} />
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

      <Dialog
        open={Boolean(activePhoto)}
        onClose={() => setActivePhoto(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: "hidden",
            bgcolor: "background.paper",
          },
        }}
      >
        {activePhoto && (
          <>
            <DialogTitle sx={{ pr: 7 }}>
              <Typography variant="h3" color="blog.subheading">Gallery photo</Typography>
              <IconButton
                onClick={() => setActivePhoto(null)}
                aria-label="Close photo preview"
                sx={{ position: "absolute", right: 12, top: 12 }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Box
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  bgcolor: "rgba(0, 0, 0, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  component="img"
                  src={activePhoto.imageUrl}
                  alt={decodeDisplayText(activePhoto.caption) || "Gallery photo"}
                  sx={{
                    display: "block",
                    width: "100%",
                    maxHeight: { xs: "68vh", md: "72vh" },
                    objectFit: "contain",
                  }}
                />
              </Box>
              {activePhoto.caption ? (
                <Typography color="text.secondary" sx={{ mt: 2, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                  {decodeDisplayText(activePhoto.caption)}
                </Typography>
              ) : (
                <Typography color="text.secondary" sx={{ mt: 2, opacity: 0.65, fontStyle: "italic" }}>
                  No caption yet.
                </Typography>
              )}
            </DialogContent>
            {canEdit && (
              <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button startIcon={<EditIcon />} onClick={() => startEdit(activePhoto)}>Edit caption</Button>
                <Button color="error" startIcon={<DeleteIcon />} onClick={() => deletePhoto(activePhoto)}>Delete photo</Button>
              </DialogActions>
            )}
          </>
        )}
      </Dialog>

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
