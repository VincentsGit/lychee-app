import { useEffect, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import LinkIcon from "@mui/icons-material/Link";
import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PlaceIcon from "@mui/icons-material/Place";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  IconButton,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
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
  isDone: false,
};

function planDate(plan) {
  if (plan.startDate && plan.endDate) return `${plan.startDate} to ${plan.endDate}`;
  return plan.startDate || plan.endDate || "";
}

function normaliseEditor(plan) {
  return {
    ...emptyPlan,
    ...plan,
    items: plan.items?.length ? plan.items.map((item) => ({ ...emptyItem, ...item })) : [{ ...emptyItem }],
  };
}

export default function Travel({ user }) {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyPlan);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const canEdit = user?.username === "runitrench";
  const selectedPlan = planId ? plans.find((plan) => String(plan.id) === String(planId)) : null;

  const loadPlans = async () => {
    setError("");
    try {
      setPlans(await api("/api/travel-plans"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const startNew = () => {
    navigate("/travel");
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
      if (editingId === "new") navigate("/travel");
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleItemDone = async (itemId) => {
    if (!canEdit || !selectedPlan) return;
    const nextPlan = {
      ...selectedPlan,
      items: selectedPlan.items.map((item) => (
        item.id === itemId ? { ...item, isDone: !item.isDone } : item
      )),
    };
    setPlans((current) => current.map((plan) => (plan.id === nextPlan.id ? nextPlan : plan)));
    try {
      await api(`/api/travel-plans/${nextPlan.id}`, { method: "PUT", body: JSON.stringify(nextPlan) });
    } catch (err) {
      setError(err.message);
      await loadPlans();
    }
  };

  const deletePlan = async (planId) => {
    if (!window.confirm("Delete this travel plan?")) return;
    await api(`/api/travel-plans/${planId}`, { method: "DELETE" });
    if (String(planId) === String(selectedPlan?.id)) navigate("/travel");
    await loadPlans();
  };

  const openPlan = (plan) => {
    setEditingId(null);
    navigate(`/travel/${plan.id}`);
  };

  const textWrapSx = {
    minWidth: 0,
    maxWidth: "100%",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  };
  const chipWrapSx = {
    height: "auto",
    minHeight: 32,
    maxWidth: "100%",
    "& .MuiChip-label": {
      display: "block",
      whiteSpace: "normal",
      overflowWrap: "anywhere",
      wordBreak: "break-word",
    },
  };

  return (
    <Stack spacing={4} sx={{ minWidth: 0, overflowX: "hidden" }}>
      <AnimatedSection>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-end" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h1" color="blog.subheading">Travel</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 760, ...textWrapSx }}>
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
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between">
                  <Typography variant="h3">Checklist</Typography>
                  <Button startIcon={<AddIcon />} onClick={addItem}>Add item</Button>
                </Stack>
                {draft.items.map((item, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 2, boxShadow: "none", borderRadius: 2 }}>
                    <Stack spacing={1.5}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                        <TextField label="Item" value={item.title} onChange={(event) => updateItem(index, "title", event.target.value)} fullWidth />
                        <IconButton onClick={() => removeItem(index)} aria-label="Remove itinerary item"><DeleteIcon /></IconButton>
                      </Stack>
                      <TextField label="Link" value={item.url} onChange={(event) => updateItem(index, "url", event.target.value)} placeholder="https://..." />
                      <TextField label="Note" value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} multiline minRows={2} />
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

      {selectedPlan ? (
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <AnimatedSection>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/travel")} sx={{ alignSelf: "flex-start" }}>
              All itineraries
            </Button>
          </AnimatedSection>

          <AnimatedSection delay={60}>
            <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, minWidth: 0, overflow: "hidden" }}>
              <Stack spacing={2.5} sx={{ minWidth: 0 }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-start" }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h2" color="blog.subheading" sx={textWrapSx}>
                      {decodeDisplayText(selectedPlan.title)}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1, minWidth: 0 }}>
                      {selectedPlan.destination && (
                        <Chip icon={<PlaceIcon />} label={decodeDisplayText(selectedPlan.destination)} variant="outlined" sx={chipWrapSx} />
                      )}
                      {planDate(selectedPlan) && <Chip icon={<CalendarMonthIcon />} label={planDate(selectedPlan)} variant="outlined" sx={chipWrapSx} />}
                      <Chip label={`${selectedPlan.items.filter((item) => item.isDone).length}/${selectedPlan.items.length} done`} variant="outlined" />
                    </Stack>
                  </Box>
                  {canEdit && (
                    <Stack direction="row">
                      <IconButton onClick={() => startEdit(selectedPlan)} aria-label="Edit travel plan"><EditIcon /></IconButton>
                      <IconButton onClick={() => deletePlan(selectedPlan.id)} aria-label="Delete travel plan"><DeleteIcon /></IconButton>
                    </Stack>
                  )}
                </Stack>

                {selectedPlan.notes && (
                  <Typography color="text.secondary" sx={{ whiteSpace: "pre-wrap", ...textWrapSx }}>
                    {decodeDisplayText(selectedPlan.notes)}
                  </Typography>
                )}

                <Stack spacing={0} sx={{ minWidth: 0 }}>
                  {selectedPlan.items.map((item, index) => (
                    <Box
                      key={item.id}
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 1.25,
                        py: { xs: 1.25, sm: 1.5 },
                        px: 0,
                        borderBottom: index === selectedPlan.items.length - 1 ? "none" : "1px solid",
                        borderColor: "divider",
                        minWidth: 0,
                      }}
                    >
                      <Checkbox
                        checked={Boolean(item.isDone)}
                        disabled={!canEdit}
                        onChange={() => toggleItemDone(item.id)}
                        inputProps={{ "aria-label": `Mark ${decodeDisplayText(item.title)} as done` }}
                        sx={{ mt: -0.75, flexShrink: 0 }}
                      />
                      <Box sx={{ minWidth: 0, flex: 1, pt: 0.2 }}>
                        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0 }}>
                          <Typography
                            fontWeight={800}
                            sx={{
                              flex: 1,
                              textDecoration: item.isDone ? "line-through" : "none",
                              color: item.isDone ? "text.secondary" : "text.primary",
                              ...textWrapSx,
                            }}
                          >
                            {decodeDisplayText(item.title)}
                          </Typography>
                          {item.url && (
                            <Link href={item.url} target="_blank" rel="noopener noreferrer" aria-label="Open link" sx={{ flexShrink: 0 }}>
                              <LinkIcon fontSize="small" />
                            </Link>
                          )}
                        </Stack>
                        {item.description && (
                          <Typography color="text.secondary" sx={textWrapSx}>
                            {decodeDisplayText(item.description)}
                          </Typography>
                        )}
                        {item.url && (
                          <Link
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            underline="hover"
                            sx={{ display: "block", mt: 0.75, fontSize: "0.875rem", ...textWrapSx }}
                          >
                            {decodeDisplayText(item.url)}
                          </Link>
                        )}
                      </Box>
                    </Box>
                  ))}
                  {!selectedPlan.items.length && <Typography color="text.secondary">No checklist items yet.</Typography>}
                </Stack>
              </Stack>
            </Paper>
          </AnimatedSection>
        </Stack>
      ) : planId && !loading ? (
        <Alert severity="warning">Travel itinerary not found.</Alert>
      ) : !planId ? (
        <Stack spacing={2}>
          {plans.map((plan, index) => (
            <AnimatedSection key={plan.id} delay={index * 60}>
              <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, minWidth: 0, overflow: "hidden" }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                  <Button
                    onClick={() => openPlan(plan)}
                    sx={{ flex: 1, justifyContent: "flex-start", textAlign: "left", textTransform: "none", minWidth: 0, p: 0.5 }}
                  >
                    <Stack alignItems="flex-start" spacing={1} sx={{ minWidth: 0, width: "100%" }}>
                      <Typography variant="h3" color="blog.subheading" sx={textWrapSx}>
                        {decodeDisplayText(plan.title)}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ minWidth: 0 }}>
                        {plan.destination && <Chip size="small" label={decodeDisplayText(plan.destination)} variant="outlined" sx={chipWrapSx} />}
                        {planDate(plan) && <Chip size="small" label={planDate(plan)} variant="outlined" sx={chipWrapSx} />}
                        <Chip size="small" label={`${plan.items.filter((item) => item.isDone).length}/${plan.items.length} done`} variant="outlined" />
                      </Stack>
                    </Stack>
                  </Button>
                  {canEdit && (
                    <Stack direction="row" sx={{ alignSelf: { xs: "flex-end", sm: "center" } }}>
                      <IconButton onClick={() => startEdit(plan)} aria-label="Edit travel plan"><EditIcon /></IconButton>
                      <IconButton onClick={() => deletePlan(plan.id)} aria-label="Delete travel plan"><DeleteIcon /></IconButton>
                    </Stack>
                  )}
                </Stack>
              </Paper>
            </AnimatedSection>
          ))}
          {!loading && !plans.length && <Typography color="text.secondary">No travel itineraries yet.</Typography>}
        </Stack>
      ) : null}
    </Stack>
  );
}
