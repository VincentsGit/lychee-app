import { useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import MovieIcon from "@mui/icons-material/Movie";
import SaveIcon from "@mui/icons-material/Save";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import TvIcon from "@mui/icons-material/Tv";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import AnimatedSection from "../components/AnimatedSection";
import { api } from "../components/api";
import { decodeDisplayText } from "../components/displayText";

const emptyItem = {
  mediaType: "movie",
  title: "",
  releaseYear: "",
  details: "",
  review: "",
  imageUrl: "",
  isWatched: false,
  rating: null,
};

function normaliseDraft(item = emptyItem) {
  return {
    ...emptyItem,
    ...item,
    rating: item.rating === undefined ? null : item.rating,
  };
}

function mediaLabel(type) {
  return type === "tv" ? "TV show" : "Movie";
}

function MediaIcon({ type }) {
  return type === "tv" ? <TvIcon /> : <MovieIcon />;
}

function RatingStars({ rating, compact = false }) {
  const isUnrated = rating === null || rating === undefined || rating === "";
  const value = isUnrated ? null : Number(rating);

  return (
    <Stack direction="row" spacing={0.25} alignItems="center" aria-label={isUnrated ? "Not rated yet" : `${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = value !== null && value >= star;
        const Icon = isUnrated ? StarIcon : filled ? StarIcon : StarBorderIcon;
        return (
          <Icon
            key={star}
            fontSize={compact ? "small" : "medium"}
            sx={{
              color: isUnrated ? "text.secondary" : "secondary.main",
              opacity: isUnrated ? 0.18 : filled ? 1 : 0.88,
            }}
          />
        );
      })}
      {!compact && (
        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
          {isUnrated ? "Not rated" : `${value}/5`}
        </Typography>
      )}
    </Stack>
  );
}

function StatusMarker({ item, compact = false }) {
  if (!item.isWatched) {
    return <Chip size={compact ? "small" : "medium"} label="Want to watch" color="secondary" variant="outlined" />;
  }
  return <RatingStars rating={item.rating} compact={compact} />;
}

function WatchlistEditor({ draft, onChange, onSave, onCancel, mode }) {
  const update = (field, value) => onChange({ ...draft, [field]: value });
  const updateRating = (value) => {
    const rating = value === "" ? null : Number(value);
    onChange({ ...draft, rating, isWatched: rating !== null ? true : draft.isWatched });
  };

  return (
    <AnimatedSection delay={40}>
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, borderTop: "3px solid", borderTopColor: "secondary.main" }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h2" color="blog.subheading">
              {mode === "new" ? "Add something to watch" : "Edit watchlist page"}
            </Typography>
            <Typography color="text.secondary">
              Add movies and TV shows, mark them watched, and write reviews when they are done.
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              select
              label="Type"
              value={draft.mediaType}
              onChange={(event) => update("mediaType", event.target.value)}
              sx={{ maxWidth: { md: 220 } }}
            >
              <MenuItem value="movie">Movie</MenuItem>
              <MenuItem value="tv">TV show</MenuItem>
            </TextField>
            <TextField label="Title" value={draft.title} onChange={(event) => update("title", event.target.value)} />
            <TextField
              label="Year / season"
              value={draft.releaseYear}
              onChange={(event) => update("releaseYear", event.target.value)}
              sx={{ maxWidth: { md: 180 } }}
            />
          </Stack>

          <TextField
            label="Poster image URL (optional)"
            value={draft.imageUrl}
            onChange={(event) => update("imageUrl", event.target.value)}
            placeholder="https://..."
          />

          <TextField
            label="Extra details"
            value={draft.details}
            onChange={(event) => update("details", event.target.value)}
            multiline
            minRows={3}
            placeholder="What is it about, where to watch it, who recommended it..."
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
            <FormControlLabel
              control={<Checkbox checked={Boolean(draft.isWatched)} onChange={(event) => update("isWatched", event.target.checked)} />}
              label="Watched"
            />
            <TextField
              select
              label="Star rating"
              value={draft.rating ?? ""}
              onChange={(event) => updateRating(event.target.value)}
              helperText="Leave blank for transparent unrated stars; choose 0 for a real zero-star rating."
              sx={{ maxWidth: { sm: 300 } }}
            >
              <MenuItem value="">No rating yet</MenuItem>
              <MenuItem value={0}>0 stars</MenuItem>
              <MenuItem value={1}>1 star</MenuItem>
              <MenuItem value={2}>2 stars</MenuItem>
              <MenuItem value={3}>3 stars</MenuItem>
              <MenuItem value={4}>4 stars</MenuItem>
              <MenuItem value={5}>5 stars</MenuItem>
            </TextField>
            <RatingStars rating={draft.rating} />
          </Stack>

          <TextField
            label="Review"
            value={draft.review}
            onChange={(event) => update("review", event.target.value)}
            multiline
            minRows={5}
            placeholder="Runi's thoughts after watching..."
          />

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={onCancel}>Cancel</Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={onSave}>Save</Button>
          </Stack>
        </Stack>
      </Paper>
    </AnimatedSection>
  );
}

function WatchCard({ item, canEdit, onOpen, onEdit, onDelete, onToggle }) {
  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        overflow: "hidden",
        borderTop: "3px solid",
        borderTopColor: item.isWatched ? "secondary.main" : "primary.main",
      }}
    >
      <Stack spacing={0} sx={{ height: "100%" }}>
        <Box
          sx={{
            minHeight: 170,
            display: "grid",
            placeItems: "center",
            bgcolor: "background.default",
            overflow: "hidden",
          }}
        >
          {item.imageUrl ? (
            <Box component="img" src={item.imageUrl} alt="" sx={{ width: "100%", height: 220, objectFit: "cover" }} />
          ) : (
            <Box sx={{ color: "secondary.main", opacity: 0.9, transform: "scale(1.4)" }}>
              <MediaIcon type={item.mediaType} />
            </Box>
          )}
        </Box>
        <Stack spacing={2} sx={{ p: 2.5, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h3" color="blog.subheading" sx={{ overflowWrap: "anywhere" }}>
                {decodeDisplayText(item.title)}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                <Chip size="small" icon={<MediaIcon type={item.mediaType} />} label={mediaLabel(item.mediaType)} variant="outlined" />
                {item.releaseYear && <Chip size="small" label={decodeDisplayText(item.releaseYear)} variant="outlined" />}
              </Stack>
            </Box>
            {canEdit && (
              <Checkbox
                checked={Boolean(item.isWatched)}
                onChange={() => onToggle(item)}
                inputProps={{ "aria-label": `Mark ${decodeDisplayText(item.title)} watched` }}
                sx={{ mt: -0.75 }}
              />
            )}
          </Stack>

          <StatusMarker item={item} />

          {item.details && (
            <Typography color="text.secondary" sx={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
              {decodeDisplayText(item.details)}
            </Typography>
          )}

          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Button component={RouterLink} to={`/watchlist/${item.id}`} onClick={() => onOpen(item)} endIcon={<VisibilityIcon />}>
              Details
            </Button>
            {canEdit && (
              <Stack direction="row" spacing={0.5}>
                <IconButton onClick={() => onEdit(item)} aria-label="Edit watchlist item"><EditIcon /></IconButton>
                <IconButton onClick={() => onDelete(item.id)} aria-label="Delete watchlist item"><DeleteIcon /></IconButton>
              </Stack>
            )}
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function Watchlist({ user }) {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyItem);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const canEdit = user?.username === "runitrench";

  const groupedCounts = useMemo(() => ({
    wanted: items.filter((item) => !item.isWatched).length,
    watched: items.filter((item) => item.isWatched).length,
  }), [items]);

  const loadItems = async () => {
    setError("");
    try {
      const nextItems = await api("/api/watchlist");
      setItems(nextItems);
      return nextItems;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (!itemId) {
      setSelectedItem(null);
      return;
    }

    let cancelled = false;
    setError("");
    setDetailLoading(true);
    api(`/api/watchlist/${itemId}`)
      .then((item) => {
        if (!cancelled) setSelectedItem(item);
      })
      .catch((err) => {
        if (!cancelled) {
          setSelectedItem(null);
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [itemId]);

  const startNew = () => {
    setEditingId("new");
    setDraft(normaliseDraft(emptyItem));
    navigate("/watchlist");
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setDraft(normaliseDraft(item));
  };

  const saveItem = async () => {
    setError("");
    try {
      const path = editingId === "new" ? "/api/watchlist" : `/api/watchlist/${editingId}`;
      const method = editingId === "new" ? "POST" : "PUT";
      const saved = await api(path, { method, body: JSON.stringify(draft) });
      setEditingId(null);
      setDraft(emptyItem);
      await loadItems();
      setSelectedItem(saved);
      navigate(`/watchlist/${saved.id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleWatched = async (item) => {
    if (!canEdit) return;
    const nextWatched = !item.isWatched;
    const optimistic = { ...item, isWatched: nextWatched, watchedAt: nextWatched ? new Date().toISOString() : null };
    setItems((current) => current.map((candidate) => (candidate.id === item.id ? optimistic : candidate)));
    if (selectedItem?.id === item.id) setSelectedItem(optimistic);
    try {
      const saved = await api(`/api/watchlist/${item.id}/watched`, {
        method: "PATCH",
        body: JSON.stringify({ isWatched: nextWatched }),
      });
      setItems((current) => current.map((candidate) => (candidate.id === saved.id ? saved : candidate)));
      if (selectedItem?.id === saved.id) setSelectedItem(saved);
    } catch (err) {
      setError(err.message);
      await loadItems();
      if (selectedItem?.id) setSelectedItem(await api(`/api/watchlist/${selectedItem.id}`));
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Delete this watchlist item?")) return;
    try {
      await api(`/api/watchlist/${id}`, { method: "DELETE" });
      if (String(id) === String(selectedItem?.id)) {
        setSelectedItem(null);
        navigate("/watchlist");
      }
      await loadItems();
    } catch (err) {
      setError(err.message);
    }
  };

  const openItem = (item) => {
    setSelectedItem(item);
    setEditingId(null);
  };

  return (
    <Stack spacing={4} sx={{ width: "100%", minWidth: 0, overflowX: "hidden" }}>
      <AnimatedSection>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-end" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h1" color="blog.subheading">Watchlist</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 760 }}>
              Movies and TV shows I want to watch, with ratings and reviews once I have watched them.
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
              <Chip label={`${groupedCounts.wanted} want to watch`} color="secondary" variant="outlined" />
              <Chip label={`${groupedCounts.watched} watched`} variant="outlined" />
            </Stack>
          </Box>
          {canEdit && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={startNew}>
              Add title
            </Button>
          )}
        </Stack>
      </AnimatedSection>

      {error && <Alert severity="error">{error}</Alert>}

      {canEdit && editingId && (
        <WatchlistEditor
          draft={draft}
          onChange={setDraft}
          onSave={saveItem}
          onCancel={() => setEditingId(null)}
          mode={editingId}
        />
      )}

      {itemId && detailLoading ? (
        <Typography color="text.secondary">Loading watchlist page...</Typography>
      ) : itemId && selectedItem ? (
        <Stack spacing={3}>
          <AnimatedSection>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/watchlist")} sx={{ alignSelf: "flex-start" }}>
              All watchlist
            </Button>
          </AnimatedSection>

          <AnimatedSection delay={60}>
            <Paper elevation={0} sx={{ overflow: "hidden", borderTop: "3px solid", borderTopColor: selectedItem.isWatched ? "secondary.main" : "primary.main" }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={0}>
                <Box
                  sx={{
                    width: { xs: "100%", md: 360 },
                    minHeight: { xs: 260, md: 520 },
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "background.default",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {selectedItem.imageUrl ? (
                    <Box component="img" src={selectedItem.imageUrl} alt="" sx={{ width: "100%", height: "100%", minHeight: { xs: 260, md: 520 }, objectFit: "cover" }} />
                  ) : (
                    <Box sx={{ color: "secondary.main", transform: "scale(2.2)" }}><MediaIcon type={selectedItem.mediaType} /></Box>
                  )}
                </Box>

                <Stack spacing={3} sx={{ p: { xs: 2.5, md: 4 }, minWidth: 0, flex: 1 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-start" }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                        <Chip icon={<MediaIcon type={selectedItem.mediaType} />} label={mediaLabel(selectedItem.mediaType)} variant="outlined" />
                        {selectedItem.releaseYear && <Chip label={decodeDisplayText(selectedItem.releaseYear)} variant="outlined" />}
                        {selectedItem.isWatched && <Chip icon={<CheckCircleIcon />} label="Watched" color="secondary" variant="outlined" />}
                      </Stack>
                      <Typography variant="h2" color="blog.subheading" sx={{ overflowWrap: "anywhere" }}>
                        {decodeDisplayText(selectedItem.title)}
                      </Typography>
                    </Box>
                    {canEdit && (
                      <Stack direction="row">
                        <IconButton onClick={() => startEdit(selectedItem)} aria-label="Edit watchlist item"><EditIcon /></IconButton>
                        <IconButton onClick={() => deleteItem(selectedItem.id)} aria-label="Delete watchlist item"><DeleteIcon /></IconButton>
                      </Stack>
                    )}
                  </Stack>

                  <Box>
                    <Typography variant="h3" color="blog.subheading" sx={{ mb: 1 }}>Rating</Typography>
                    <RatingStars rating={selectedItem.rating} />
                    {selectedItem.rating === 0 && (
                      <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                        This is a real 0-star rating, shown with solid outlined stars so it is different from transparent unrated stars.
                      </Typography>
                    )}
                    {!selectedItem.isWatched && (
                      <Chip label="Want to watch" color="secondary" variant="outlined" sx={{ mt: 1.5 }} />
                    )}
                  </Box>

                  {canEdit && (
                    <Box>
                      <Button
                        variant={selectedItem.isWatched ? "outlined" : "contained"}
                        onClick={() => toggleWatched(selectedItem)}
                      >
                        {selectedItem.isWatched ? "Mark as want to watch" : "Tick off as watched"}
                      </Button>
                    </Box>
                  )}

                  <Divider />

                  <Stack spacing={1.5}>
                    <Typography variant="h3" color="blog.subheading">Extra details</Typography>
                    <Typography color="text.secondary" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                      {selectedItem.details ? decodeDisplayText(selectedItem.details) : "No extra details yet."}
                    </Typography>
                  </Stack>

                  <Stack spacing={1.5}>
                    <Typography variant="h3" color="blog.subheading">Runi's review</Typography>
                    <Typography color="text.secondary" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                      {selectedItem.review ? decodeDisplayText(selectedItem.review) : "No review yet."}
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Paper>
          </AnimatedSection>
        </Stack>
      ) : itemId && !loading && !detailLoading ? (
        <Alert severity="warning">Watchlist item not found.</Alert>
      ) : !itemId ? (
        <Stack spacing={2.5}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
              gap: 2.5,
            }}
          >
            {items.map((item, index) => (
              <AnimatedSection key={item.id} delay={index * 45}>
                <WatchCard
                  item={item}
                  canEdit={canEdit}
                  onOpen={openItem}
                  onEdit={startEdit}
                  onDelete={deleteItem}
                  onToggle={toggleWatched}
                />
              </AnimatedSection>
            ))}
          </Box>
          {!loading && !items.length && (
            <Paper elevation={0} sx={{ p: 3 }}>
              <Typography color="text.secondary">No movies or TV shows in the watchlist yet.</Typography>
            </Paper>
          )}
        </Stack>
      ) : null}
    </Stack>
  );
}
