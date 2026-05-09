import { useEffect, useMemo, useRef, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import FavoriteIcon from "@mui/icons-material/Favorite";
import SaveIcon from "@mui/icons-material/Save";
import { Alert, Box, Button, Chip, IconButton, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import AnimatedSection from "../components/AnimatedSection";
import { api } from "../components/api";
import { decodeDisplayText } from "../components/displayText";

const emptyEventDraft = { artist: "", city: "", eventDate: "", dateNote: "", openers: "", status: "upcoming" };
const emptyWishlistDraft = { artist: "" };

const monoFont = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

const statusOptions = [
  { value: "upcoming", label: "Upcoming" },
  { value: "attended", label: "Attended" },
  { value: "cancelled", label: "Cancelled" },
];

const toneSx = {
  upcoming: { color: "#9fe1cb", bgcolor: "rgba(29, 158, 117, 0.13)" },
  attended: { color: "rgba(221, 213, 239, 0.74)", bgcolor: "rgba(221, 213, 239, 0.08)" },
  cancelled: { color: "#f0997b", bgcolor: "rgba(153, 60, 29, 0.16)" },
  soon: { color: "#85b7eb", bgcolor: "rgba(24, 95, 165, 0.18)" },
};

const badgeSx = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid currentColor",
  borderRadius: 999,
  px: 1.05,
  py: 0.28,
  fontFamily: monoFont,
  fontSize: { xs: "0.58rem", sm: "0.62rem" },
  fontWeight: 800,
  letterSpacing: "0.09em",
  lineHeight: 1,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

function eventToDraft(event) {
  return {
    artist: decodeDisplayText(event.artist || ""),
    city: decodeDisplayText(event.city || ""),
    eventDate: event.eventDate || "",
    dateNote: decodeDisplayText(event.dateNote || ""),
    openers: decodeDisplayText(event.openers || ""),
    status: event.status || "upcoming",
  };
}

function dateParts(event) {
  if (event.eventDate) {
    const [year, month, day] = event.eventDate.split("-").map(Number);
    if (year && month && day) {
      const date = new Date(year, month - 1, day);
      return {
        day: String(day).padStart(2, "0"),
        month: date.toLocaleString("en", { month: "short" }),
        year: String(year).slice(-2),
      };
    }
  }
  const fallback = decodeDisplayText(event.dateNote || "TBA");
  return { day: "—", month: fallback, year: "" };
}

function statusLabel(status) {
  return statusOptions.find((item) => item.value === status)?.label || "Upcoming";
}

function DateBlock({ event }) {
  const parts = dateParts(event);
  return (
    <Box sx={{ textAlign: "center", flexShrink: 0 }}>
      <Box
        component="span"
        sx={{
          display: "block",
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: { xs: "1.45rem", sm: "1.6rem" },
          fontWeight: 400,
          lineHeight: 1,
          color: "text.primary",
        }}
      >
        {parts.day}
      </Box>
      <Box
        component="span"
        sx={{
          display: "block",
          mt: 0.12,
          color: "rgba(221, 213, 239, 0.66)",
          fontFamily: monoFont,
          fontSize: "0.58rem",
          fontWeight: 800,
          letterSpacing: "0.12em",
          lineHeight: 1.1,
          textTransform: "uppercase",
        }}
      >
        {parts.month} {parts.year}
      </Box>
    </Box>
  );
}

function ShowRow({ event, canEdit, onEdit, onDelete }) {
  const isCancelled = event.status === "cancelled";
  const isUpcoming = event.status === "upcoming";
  const label = isUpcoming && event.eventDate === "2026-05-12" ? "Soon" : statusLabel(event.status);
  const tone = label === "Soon" ? "soon" : event.status;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "3.5rem minmax(0, 1fr)", sm: "4.1rem minmax(0, 1fr) auto" },
        alignItems: "center",
        gap: { xs: 0.75, sm: 1.4 },
        px: { xs: 1.1, sm: 1.4 },
        py: { xs: 1.05, sm: 1.1 },
        borderBottom: "1px solid rgba(205, 180, 255, 0.18)",
        bgcolor: !isUpcoming ? "rgba(255, 255, 255, 0.018)" : "transparent",
        opacity: isCancelled ? 0.62 : 1,
        "&:last-child": { borderBottom: 0 },
      }}
    >
      <DateBlock event={event} />
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            color: isCancelled ? "rgba(221, 213, 239, 0.6)" : "text.primary",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 0.5,
            fontSize: { xs: "0.98rem", sm: "1.04rem" },
            fontWeight: 800,
            lineHeight: 1.25,
            textDecoration: isCancelled ? "line-through" : "none",
          }}
        >
          {decodeDisplayText(event.artist)}
        </Typography>
        {event.city && (
          <Typography sx={{ mt: 0.18, color: "rgba(221, 213, 239, 0.66)", fontSize: "0.86rem", lineHeight: 1.35 }}>
            {decodeDisplayText(event.city)}
          </Typography>
        )}
        {event.openers && (
          <Typography sx={{ mt: 0.22, color: "rgba(221, 213, 239, 0.62)", fontSize: "0.8rem", fontStyle: "italic", lineHeight: 1.35 }}>
            w/ {decodeDisplayText(event.openers)}
          </Typography>
        )}
      </Box>
      <Stack
        spacing={0.8}
        alignItems={{ xs: "flex-start", sm: "flex-end" }}
        sx={{ gridColumn: { xs: "2", sm: "auto" } }}
      >
        <Box component="span" sx={{ ...badgeSx, ...toneSx[tone] }}>{label}</Box>
        {canEdit && (
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" onClick={() => onEdit(event)} aria-label={`Edit ${event.artist}`}><EditIcon fontSize="inherit" /></IconButton>
            <IconButton size="small" onClick={() => onDelete(event)} aria-label={`Delete ${event.artist}`} color="error"><DeleteIcon fontSize="inherit" /></IconButton>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

function Section({ label, children }) {
  return (
    <Box component="section" sx={{ mb: { xs: 4, md: 5 } }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
        <Typography
          sx={{
            color: "secondary.main",
            fontFamily: monoFont,
            fontSize: "0.7rem",
            fontWeight: 900,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </Typography>
        <Box sx={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(199, 146, 255, 0.34), transparent)" }} />
      </Stack>
      {children}
    </Box>
  );
}

function ConcertForm({ draft, setDraft, editingId, onSubmit, onCancel, saving }) {
  return (
    <Box component="form" onSubmit={onSubmit}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField label="Artist" value={draft.artist} onChange={(event) => setDraft((current) => ({ ...current, artist: event.target.value }))} required fullWidth />
          <TextField label="City" value={draft.city} onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))} fullWidth />
          <TextField select label="Status" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))} sx={{ minWidth: { md: 180 } }}>
            {statusOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
        </Stack>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField label="Date" type="date" value={draft.eventDate} onChange={(event) => setDraft((current) => ({ ...current, eventDate: event.target.value }))} InputLabelProps={{ shrink: true }} sx={{ minWidth: { md: 190 } }} />
          <TextField label="Date note if no exact date" placeholder="Jul 24 or TBA" value={draft.dateNote} onChange={(event) => setDraft((current) => ({ ...current, dateNote: event.target.value }))} fullWidth />
        </Stack>
        <TextField label="Openers / extra notes" placeholder="Night Tapes · Noise Dept" value={draft.openers} onChange={(event) => setDraft((current) => ({ ...current, openers: event.target.value }))} fullWidth />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          {editingId && <Button onClick={onCancel} startIcon={<CloseIcon />}>Cancel edit</Button>}
          <Button type="submit" variant="contained" startIcon={editingId ? <SaveIcon /> : <AddIcon />} disabled={saving}>
            {editingId ? "Save concert" : "Add concert"}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

export default function Concerts({ user }) {
  const canEdit = user?.username === "runitrench";
  const [events, setEvents] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [eventDraft, setEventDraft] = useState(emptyEventDraft);
  const [wishlistDraft, setWishlistDraft] = useState(emptyWishlistDraft);
  const [editingEventId, setEditingEventId] = useState(null);
  const [editingWishlistId, setEditingWishlistId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const editorRef = useRef(null);

  const scrollToEditor = () => {
    window.setTimeout(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const loadConcerts = () => {
    setLoading(true);
    api("/api/concerts")
      .then((data) => {
        setEvents(data.events || []);
        setWishlist(data.wishlist || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadConcerts();
  }, []);

  const pastShows = useMemo(() => events.filter((event) => event.status !== "upcoming"), [events]);
  const upcomingShows = useMemo(() => events.filter((event) => event.status === "upcoming"), [events]);

  const resetEventForm = () => {
    setEventDraft(emptyEventDraft);
    setEditingEventId(null);
  };

  const saveEvent = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");
    setSaving(true);
    try {
      const saved = await api(editingEventId ? `/api/concerts/events/${editingEventId}` : "/api/concerts/events", {
        method: editingEventId ? "PUT" : "POST",
        body: JSON.stringify(eventDraft),
      });
      setEvents((current) => editingEventId ? current.map((item) => (item.id === saved.id ? saved : item)) : [...current, saved]);
      resetEventForm();
      setStatus(editingEventId ? "Concert saved." : "Concert added.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const editEvent = (event) => {
    setEditingEventId(event.id);
    setEventDraft(eventToDraft(event));
    setStatus(`Editing ${decodeDisplayText(event.artist)}. Make changes in the form above, then press Save concert.`);
    setError("");
    scrollToEditor();
  };

  const deleteEvent = async (event) => {
    if (!window.confirm(`Delete ${decodeDisplayText(event.artist)} from concerts?`)) return;
    setError("");
    setStatus("");
    try {
      await api(`/api/concerts/events/${event.id}`, { method: "DELETE" });
      setEvents((current) => current.filter((item) => item.id !== event.id));
      if (editingEventId === event.id) resetEventForm();
      setStatus("Concert deleted.");
    } catch (err) {
      setError(err.message);
    }
  };

  const saveWishlist = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");
    setSaving(true);
    try {
      const saved = await api(editingWishlistId ? `/api/concerts/wishlist/${editingWishlistId}` : "/api/concerts/wishlist", {
        method: editingWishlistId ? "PUT" : "POST",
        body: JSON.stringify(wishlistDraft),
      });
      setWishlist((current) => editingWishlistId ? current.map((item) => (item.id === saved.id ? saved : item)) : [...current, saved]);
      setWishlistDraft(emptyWishlistDraft);
      setEditingWishlistId(null);
      setStatus(editingWishlistId ? "Wishlist artist saved." : "Wishlist artist added.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const editWishlist = (item) => {
    setEditingWishlistId(item.id);
    setWishlistDraft({ artist: decodeDisplayText(item.artist || "") });
    setStatus(`Editing ${decodeDisplayText(item.artist)}. Save it in the wishlist field above.`);
    setError("");
    scrollToEditor();
  };

  const deleteWishlist = async (item) => {
    if (!window.confirm(`Delete ${decodeDisplayText(item.artist)} from the wishlist?`)) return;
    setError("");
    setStatus("");
    try {
      await api(`/api/concerts/wishlist/${item.id}`, { method: "DELETE" });
      setWishlist((current) => current.filter((entry) => entry.id !== item.id));
      if (editingWishlistId === item.id) {
        setEditingWishlistId(null);
        setWishlistDraft(emptyWishlistDraft);
      }
      setStatus("Wishlist artist deleted.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Stack spacing={4.5} sx={{ alignItems: "center" }}>
      <AnimatedSection sx={{ width: "100%", maxWidth: 980 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            overflow: "hidden",
            position: "relative",
            background: "rgba(36, 31, 53, 0.82)",
          }}
        >
          <Stack spacing={2.2} sx={{ position: "relative" }}>
            <Chip
              icon={<EventAvailableIcon />}
              label="concert tracker"
              variant="outlined"
              sx={{
                alignSelf: "flex-start",
                color: "rgba(221, 213, 239, 0.78)",
                borderColor: "rgba(221, 213, 239, 0.28)",
                bgcolor: "rgba(255, 255, 255, 0.025)",
              }}
            />
            <Box>
              <Typography variant="h1" color="text.primary">Concerts</Typography>
              <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
                A little tracker for past shows, upcoming concerts, and artists Runi wants to see.
              </Typography>
            </Box>
            <Stack direction="row" spacing={{ xs: 3, sm: 5, md: 7 }} useFlexGap flexWrap="wrap">
              {[
                [String(pastShows.length), "Past"],
                [String(upcomingShows.length), "Upcoming"],
                [String(wishlist.length), "Wishlist"],
              ].map(([number, label]) => (
                <Box key={label} sx={{ minWidth: 76 }}>
                  <Box component="span" sx={{ display: "block", fontFamily: '"Playfair Display", Georgia, serif', fontSize: { xs: "1.8rem", sm: "2.2rem" }, lineHeight: 1, color: "#fff7ec" }}>
                    {number}
                  </Box>
                  <Box component="span" sx={{ display: "block", mt: 0.35, color: "rgba(221, 213, 239, 0.66)", fontFamily: monoFont, fontSize: "0.66rem", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                    {label}
                  </Box>
                </Box>
              ))}
            </Stack>
            {canEdit && (
              <Button variant="contained" startIcon={<EditIcon />} onClick={scrollToEditor} sx={{ alignSelf: "flex-start" }}>
                Edit concerts
              </Button>
            )}
          </Stack>
        </Paper>
      </AnimatedSection>

      {(error || status) && (
        <Box sx={{ width: "100%", maxWidth: 980 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {status && <Alert severity="success">{status}</Alert>}
        </Box>
      )}

      {canEdit && (
        <Box ref={editorRef} sx={{ width: "100%", maxWidth: 980, scrollMarginTop: { xs: 88, md: 32 } }}>
          <AnimatedSection delay={40}>
            <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, borderTop: "3px solid", borderTopColor: "secondary.main" }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h2" color="blog.subheading">Edit concert tracker</Typography>
                <Typography color="text.secondary">Add more concerts, update statuses, or change the wishlist.</Typography>
              </Box>
              <ConcertForm draft={eventDraft} setDraft={setEventDraft} editingId={editingEventId} onSubmit={saveEvent} onCancel={resetEventForm} saving={saving} />
              <Box component="form" onSubmit={saveWishlist}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                  <TextField label="Wishlist artist" value={wishlistDraft.artist} onChange={(event) => setWishlistDraft({ artist: event.target.value })} required fullWidth />
                  {editingWishlistId && <Button onClick={() => { setEditingWishlistId(null); setWishlistDraft(emptyWishlistDraft); }}>Cancel</Button>}
                  <Button type="submit" variant="outlined" startIcon={editingWishlistId ? <SaveIcon /> : <FavoriteIcon />} disabled={saving} sx={{ flexShrink: 0 }}>
                    {editingWishlistId ? "Save artist" : "Add artist"}
                  </Button>
                </Stack>
              </Box>
            </Stack>
            </Paper>
          </AnimatedSection>
        </Box>
      )}


      <Box sx={{ width: "100%", maxWidth: 820 }}>
        <AnimatedSection delay={100}>
          <Section label="Past">
            <Paper elevation={0} sx={{ overflow: "hidden", borderRadius: 2.25, bgcolor: "rgba(23, 19, 38, 0.42)", borderColor: "rgba(205, 180, 255, 0.18)" }}>
              {loading && <Box sx={{ p: 3 }}><Typography color="text.secondary">Loading concerts...</Typography></Box>}
              {!loading && pastShows.map((event) => <ShowRow key={event.id} event={event} canEdit={canEdit} onEdit={editEvent} onDelete={deleteEvent} />)}
              {!loading && pastShows.length === 0 && <Box sx={{ p: 3 }}><Typography color="text.secondary">No past concerts yet.</Typography></Box>}
            </Paper>
          </Section>
        </AnimatedSection>

        <AnimatedSection delay={140}>
          <Section label="Upcoming">
            <Paper elevation={0} sx={{ overflow: "hidden", borderRadius: 2.25, bgcolor: "rgba(23, 19, 38, 0.42)", borderColor: "rgba(205, 180, 255, 0.18)" }}>
              {loading && <Box sx={{ p: 3 }}><Typography color="text.secondary">Loading concerts...</Typography></Box>}
              {!loading && upcomingShows.map((event) => <ShowRow key={event.id} event={event} canEdit={canEdit} onEdit={editEvent} onDelete={deleteEvent} />)}
              {!loading && upcomingShows.length === 0 && <Box sx={{ p: 3 }}><Typography color="text.secondary">No upcoming concerts yet.</Typography></Box>}
            </Paper>
          </Section>
        </AnimatedSection>

        <AnimatedSection delay={180}>
          <Section label="Wishlist">
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))",
                gap: 1.2,
              }}
            >
              {wishlist.map((item) => (
                <Paper
                  key={item.id}
                  elevation={0}
                  sx={{
                    minHeight: 58,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.1,
                    px: 2,
                    py: 1.4,
                    borderRadius: 3,
                    bgcolor: "rgba(255, 255, 255, 0.035)",
                    borderColor: "rgba(205, 180, 255, 0.18)",
                  }}
                >
                  <FavoriteIcon sx={{ color: "secondary.main", fontSize: 15, flexShrink: 0 }} />
                  <Typography sx={{ color: "text.secondary", fontWeight: 700, flex: 1 }}>{decodeDisplayText(item.artist)}</Typography>
                  {canEdit && (
                    <Stack direction="row" spacing={0.3}>
                      <IconButton size="small" onClick={() => editWishlist(item)} aria-label={`Edit ${item.artist}`}><EditIcon fontSize="inherit" /></IconButton>
                      <IconButton size="small" onClick={() => deleteWishlist(item)} aria-label={`Delete ${item.artist}`} color="error"><DeleteIcon fontSize="inherit" /></IconButton>
                    </Stack>
                  )}
                </Paper>
              ))}
              {!loading && wishlist.length === 0 && <Typography color="text.secondary">No wishlist artists yet.</Typography>}
            </Box>
          </Section>
        </AnimatedSection>
      </Box>
    </Stack>
  );
}
