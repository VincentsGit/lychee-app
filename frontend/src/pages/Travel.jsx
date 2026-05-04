import { useEffect, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import LinkIcon from "@mui/icons-material/Link";
import SaveIcon from "@mui/icons-material/Save";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AnimatedSection from "../components/AnimatedSection";
import { api } from "../components/api";
import { decodeDisplayText } from "../components/displayText";

const emptyPlan = {
  title: "",
  destination: "",
  startDate: "",
  endDate: "",
  notes: "",
  items: [],
};

const emptyItem = {
  dayLabel: "",
  timeLabel: "",
  title: "",
  description: "",
  url: "",
};

function planDate(plan) {
  if (plan.startDate && plan.endDate) return `${plan.startDate} to ${plan.endDate}`;
  return plan.startDate || plan.endDate || "Dates to decide";
}

function normaliseEditor(plan) {
  return {
    ...emptyPlan,
    ...plan,
    items: plan.items?.length ? plan.items.map((item) => ({ ...emptyItem, ...item })) : [{ ...emptyItem }],
  };
}

export default function Travel({ user }) {
  const [plans, setPlans] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyPlan);
  const [error, setError] = useState("");
  const canEdit = user?.username === "runitrench";

  const loadPlans = async () => {
    setError("");
    try {
      setPlans(await api("/api/travel-plans"));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const startNew = () => {
    setEditingId("new");
    setDraft(normaliseEditor(emptyPlan));
  };

  const startEdit = (plan) => {
    setEditingId(plan.id);
    setDraft(normaliseEditor(plan));
  };

  const updateDraft = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const updateItem = (index, field, value) => {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      )),
    }));
  };

  const addItem = () => {
    setDraft((current) => ({ ...current, items: [...current.items, { ...emptyItem }] }));
  };

  const removeItem = (index) => {
    setDraft((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const savePlan = async () => {
    setError("");
    try {
      const path = editingId === "new" ? "/api/travel-plans" : `/api/travel-plans/${editingId}`;
      const method = editingId === "new" ? "POST" : "PUT";
      await api(path, { method, body: JSON.stringify(draft) });
      setEditingId(null);
      setDraft(emptyPlan);
      await loadPlans();
    } catch (err) {
      setError(err.message);
    }
  };

  const deletePlan = async (planId) => {
    if (!window.confirm("Delete this travel plan?")) return;
    await api(`/api/travel-plans/${planId}`, { method: "DELETE" });
    await loadPlans();
  };

  return (
    <Stack spacing={4}>
      <AnimatedSection>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-end" }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h1" color="blog.subheading">Travel</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 760 }}>
              Holiday plans, saved ideas, bookings, links, and day-by-day itineraries.
            </Typography>
          </Box>
          {canEdit && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={startNew}>
              New plan
            </Button>
          )}
        </Stack>
      </AnimatedSection>

      {error && <Alert severity="error">{error}</Alert>}

      {canEdit && editingId && (
        <AnimatedSection delay={60}>
          <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Stack spacing={2.5}>
              <Typography variant="h2">{editingId === "new" ? "New travel plan" : "Edit travel plan"}</Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField label="Title" value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} />
                <TextField label="Destination" value={draft.destination} onChange={(event) => updateDraft("destination", event.target.value)} />
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField label="Start date" type="date" value={draft.startDate} onChange={(event) => updateDraft("startDate", event.target.value)} InputLabelProps={{ shrink: true }} />
                <TextField label="End date" type="date" value={draft.endDate} onChange={(event) => updateDraft("endDate", event.target.value)} InputLabelProps={{ shrink: true }} />
              </Stack>
              <TextField label="Notes" value={draft.notes} onChange={(event) => updateDraft("notes", event.target.value)} multiline minRows={3} />

              <Divider />
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="h3">Itinerary</Typography>
                  <Button startIcon={<AddIcon />} onClick={addItem}>Add item</Button>
                </Stack>
                {draft.items.map((item, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 2, boxShadow: "none" }}>
                    <Stack spacing={1.5}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                        <TextField label="Day" value={item.dayLabel} onChange={(event) => updateItem(index, "dayLabel", event.target.value)} placeholder="Day 1" />
                        <TextField label="Time" value={item.timeLabel} onChange={(event) => updateItem(index, "timeLabel", event.target.value)} placeholder="10:30" />
                        <TextField label="Item" value={item.title} onChange={(event) => updateItem(index, "title", event.target.value)} />
                        <IconButton onClick={() => removeItem(index)} aria-label="Remove itinerary item"><DeleteIcon /></IconButton>
                      </Stack>
                      <TextField label="Link" value={item.url} onChange={(event) => updateItem(index, "url", event.target.value)} placeholder="https://..." />
                      <TextField label="Details" value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} multiline minRows={2} />
                    </Stack>
                  </Paper>
                ))}
              </Stack>

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button onClick={() => setEditingId(null)}>Cancel</Button>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={savePlan}>Save</Button>
              </Stack>
            </Stack>
          </Paper>
        </AnimatedSection>
      )}

      <Stack spacing={3}>
        {plans.map((plan, index) => (
          <AnimatedSection key={plan.id} delay={index * 60}>
            <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 } }}>
              <Stack spacing={2.5}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-start" }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h2" color="blog.subheading">{decodeDisplayText(plan.title)}</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                      {plan.destination && <Chip label={decodeDisplayText(plan.destination)} variant="outlined" />}
                      <Chip label={planDate(plan)} variant="outlined" />
                      <Chip label={`${plan.items.length} itinerary items`} variant="outlined" />
                    </Stack>
                  </Box>
                  {canEdit && (
                    <Stack direction="row">
                      <IconButton onClick={() => startEdit(plan)} aria-label="Edit travel plan"><EditIcon /></IconButton>
                      <IconButton onClick={() => deletePlan(plan.id)} aria-label="Delete travel plan"><DeleteIcon /></IconButton>
                    </Stack>
                  )}
                </Stack>

                {plan.notes && <Typography color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>{decodeDisplayText(plan.notes)}</Typography>}

                <Stack spacing={1.5}>
                  {plan.items.map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "140px 110px 1fr" },
                        gap: 1.5,
                        p: 1.5,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 2,
                      }}
                    >
                      <Typography fontWeight={800}>{decodeDisplayText(item.dayLabel) || "Any day"}</Typography>
                      <Typography color="text.secondary">{decodeDisplayText(item.timeLabel) || "Flexible"}</Typography>
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight={800}>{decodeDisplayText(item.title)}</Typography>
                          {item.url && (
                            <Link href={item.url} target="_blank" rel="noopener noreferrer" aria-label="Open link">
                              <LinkIcon fontSize="small" />
                            </Link>
                          )}
                        </Stack>
                        {item.description && <Typography color="text.secondary">{decodeDisplayText(item.description)}</Typography>}
                      </Box>
                    </Box>
                  ))}
                  {!plan.items.length && <Typography color="text.secondary">No itinerary items yet.</Typography>}
                </Stack>
              </Stack>
            </Paper>
          </AnimatedSection>
        ))}
      </Stack>
    </Stack>
  );
}
