import { useEffect, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ForumIcon from "@mui/icons-material/Forum";
import SaveIcon from "@mui/icons-material/Save";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import AnimatedSection from "../components/AnimatedSection";
import { api } from "../components/api";
import { decodeDisplayText } from "../components/displayText";
import flowersGif from "../icons/flowers.gif";
import lavenderGif from "../icons/lavender.gif";
import pandaStatic from "../icons/panda.png";
import pandaBounce from "../icons/panda_menu.gif";
import pandaDance from "../images/panda_dance.gif";

const defaultHome = {
  hero: {
    chips: [
      { label: "my blog", variant: "filled" },
      { label: "thoughts, memories, comments", variant: "outlined" },
    ],
    title: "Welcome to my website!",
    intro: "This is my little corner of the internet where I can write about whatever I want, keep memories in one place, and share updates without everything disappearing into social media.",
    primaryButton: { label: "Read my blog", to: "/blog" },
    secondaryButton: { label: "Leave a comment", to: "/register" },
    pandaImage: "bounce",
    imageAlt: "Bouncing panda",
    showLavender: true,
    showFlowers: true,
  },
  bubbles: [
    {
      icon: "stories",
      title: "My little diary",
      text: "I can keep all my posts in one place, grouped by year and month so they are easy to look back on later.",
    },
    {
      icon: "comments",
      title: "Comments are open",
      text: "Make an account if you want to comment on my posts and have your own cute little profile.",
    },
    {
      icon: "heart",
      title: "Made by Vincent",
      text: "This website was designed and developed by Vincent, my boyfriend, who also captured my lavender colours and cute lychee vibe.",
    },
  ],
  cta: {
    title: "Why I wanted this",
    text: "I wanted somewhere that felt more mine than a normal social media page. Somewhere cosy for thoughts, photos, videos, plans, comments, and anything else I feel like saving.",
    buttonLabel: "More about me",
    buttonTo: "/about",
  },
};

const iconOptions = [
  { value: "stories", label: "Book", icon: AutoStoriesIcon },
  { value: "comments", label: "Comments", icon: ForumIcon },
  { value: "heart", label: "Heart", icon: FavoriteIcon },
];

const pandaOptions = [
  { value: "bounce", label: "Bouncing panda", src: pandaBounce },
  { value: "dance", label: "Dancing panda", src: pandaDance },
  { value: "static", label: "Static panda", src: pandaStatic },
];

const emptyBubble = {
  icon: "heart",
  title: "",
  text: "",
};

function normaliseHome(data) {
  return {
    ...defaultHome,
    ...data,
    hero: { ...defaultHome.hero, ...(data?.hero || {}) },
    bubbles: data?.bubbles?.length ? data.bubbles : defaultHome.bubbles,
    cta: { ...defaultHome.cta, ...(data?.cta || {}) },
  };
}

function BubbleIcon({ type }) {
  const match = iconOptions.find((item) => item.value === type) || iconOptions[2];
  const Icon = match.icon;
  return <Icon />;
}

function getPandaImage(type) {
  return pandaOptions.find((item) => item.value === type)?.src || pandaBounce;
}

export default function Home({ user }) {
  const [page, setPage] = useState(defaultHome);
  const [draft, setDraft] = useState(defaultHome);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const canEdit = user?.username === "runitrench";

  useEffect(() => {
    api("/api/home")
      .then((data) => {
        const next = normaliseHome(data);
        setPage(next);
        setDraft(next);
      })
      .catch((err) => setError(err.message));
  }, []);

  const startEditing = () => {
    setStatus("");
    setError("");
    setDraft(normaliseHome(page));
    setEditing(true);
  };

  const updateHero = (field, value) => {
    setDraft((current) => ({ ...current, hero: { ...current.hero, [field]: value } }));
  };

  const updateHeroButton = (button, field, value) => {
    setDraft((current) => ({
      ...current,
      hero: {
        ...current.hero,
        [button]: { ...current.hero[button], [field]: value },
      },
    }));
  };

  const updateChip = (index, field, value) => {
    setDraft((current) => ({
      ...current,
      hero: {
        ...current.hero,
        chips: current.hero.chips.map((chip, chipIndex) => (
          chipIndex === index ? { ...chip, [field]: value } : chip
        )),
      },
    }));
  };

  const addChip = () => {
    setDraft((current) => ({
      ...current,
      hero: {
        ...current.hero,
        chips: [...current.hero.chips, { label: "", variant: "outlined" }],
      },
    }));
  };

  const removeChip = (index) => {
    setDraft((current) => ({
      ...current,
      hero: {
        ...current.hero,
        chips: current.hero.chips.filter((_, chipIndex) => chipIndex !== index),
      },
    }));
  };

  const updateBubble = (index, field, value) => {
    setDraft((current) => ({
      ...current,
      bubbles: current.bubbles.map((bubble, bubbleIndex) => (
        bubbleIndex === index ? { ...bubble, [field]: value } : bubble
      )),
    }));
  };

  const addBubble = () => {
    setDraft((current) => ({ ...current, bubbles: [...current.bubbles, { ...emptyBubble }] }));
  };

  const removeBubble = (index) => {
    setDraft((current) => ({
      ...current,
      bubbles: current.bubbles.filter((_, bubbleIndex) => bubbleIndex !== index),
    }));
  };

  const updateCta = (field, value) => {
    setDraft((current) => ({ ...current, cta: { ...current.cta, [field]: value } }));
  };

  const save = async () => {
    setStatus("");
    setError("");
    try {
      const data = await api("/api/home", {
        method: "PUT",
        body: JSON.stringify(draft),
      });
      const next = normaliseHome(data);
      setPage(next);
      setDraft(next);
      setEditing(false);
      setStatus("Home page saved.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Stack spacing={{ xs: 6, md: 9 }}>
      <AnimatedSection>
        <Stack spacing={2.5}>
          {canEdit && (
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant={editing ? "outlined" : "contained"}
                startIcon={editing ? <CloseIcon /> : <EditIcon />}
                onClick={() => (editing ? setEditing(false) : startEditing())}
              >
                {editing ? "Cancel" : "Edit Home"}
              </Button>
            </Box>
          )}
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Stack spacing={3}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {page.hero.chips.map((chip, index) => (
                    <Chip
                      key={`${chip.label}-${index}`}
                      label={decodeDisplayText(chip.label)}
                      color={chip.variant === "filled" ? "primary" : "default"}
                      variant={chip.variant === "outlined" ? "outlined" : "filled"}
                    />
                  ))}
                </Stack>
                <Typography variant="h1" color="blog.subheading">
                  {decodeDisplayText(page.hero.title)}
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 680 }}>
                  {decodeDisplayText(page.hero.intro)}
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button component={RouterLink} to={page.hero.primaryButton.to} variant="contained" color="secondary" endIcon={<ArrowForwardIcon />}>
                    {decodeDisplayText(page.hero.primaryButton.label)}
                  </Button>
                  <Button component={RouterLink} to={page.hero.secondaryButton.to} variant="outlined">
                    {decodeDisplayText(page.hero.secondaryButton.label)}
                  </Button>
                </Stack>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, md: 4 },
                  minHeight: { xs: 360, md: 410 },
                  display: "grid",
                  placeItems: "center",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Box component="img" src={getPandaImage(page.hero.pandaImage)} alt={decodeDisplayText(page.hero.imageAlt)} sx={{ width: "74%", maxWidth: 310, zIndex: 1 }} />
                {page.hero.showLavender && (
                  <Box component="img" src={lavenderGif} alt="" sx={{ position: "absolute", left: 28, top: 28, width: 72 }} />
                )}
                {page.hero.showFlowers && (
                  <Box component="img" src={flowersGif} alt="" sx={{ position: "absolute", right: 22, bottom: 18, width: 112 }} />
                )}
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      </AnimatedSection>

      {error && <Alert severity="error">{error}</Alert>}
      {status && <Alert severity="success">{status}</Alert>}

      {canEdit && editing && (
        <AnimatedSection delay={60}>
          <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h2" color="blog.subheading">Edit home page</Typography>
                <Typography color="text.secondary">Update the hero, buttons, bubbles, and lower call-to-action.</Typography>
              </Box>

              <Stack spacing={2}>
                <Typography variant="h3">Hero</Typography>
                <Stack spacing={1.5}>
                  {draft.hero.chips.map((chip, index) => (
                    <Stack key={index} direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                      <TextField label="Chip label" value={chip.label} onChange={(event) => updateChip(index, "label", event.target.value)} />
                      <TextField
                        select
                        label="Chip style"
                        value={chip.variant}
                        onChange={(event) => updateChip(index, "variant", event.target.value)}
                        sx={{ minWidth: { sm: 170 } }}
                      >
                        <MenuItem value="filled">Filled</MenuItem>
                        <MenuItem value="outlined">Outlined</MenuItem>
                      </TextField>
                      <IconButton onClick={() => removeChip(index)} aria-label="Remove chip">
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  ))}
                  <Box>
                    <Button startIcon={<AddIcon />} onClick={addChip} disabled={draft.hero.chips.length >= 4}>
                      Add chip
                    </Button>
                  </Box>
                </Stack>

                <TextField label="Main headline" value={draft.hero.title} onChange={(event) => updateHero("title", event.target.value)} />
                <TextField label="Intro text" value={draft.hero.intro} onChange={(event) => updateHero("intro", event.target.value)} multiline minRows={3} />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField label="Primary button label" value={draft.hero.primaryButton.label} onChange={(event) => updateHeroButton("primaryButton", "label", event.target.value)} />
                  <TextField label="Primary button link" value={draft.hero.primaryButton.to} onChange={(event) => updateHeroButton("primaryButton", "to", event.target.value)} />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField label="Secondary button label" value={draft.hero.secondaryButton.label} onChange={(event) => updateHeroButton("secondaryButton", "label", event.target.value)} />
                  <TextField label="Secondary button link" value={draft.hero.secondaryButton.to} onChange={(event) => updateHeroButton("secondaryButton", "to", event.target.value)} />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    select
                    label="Panda image"
                    value={draft.hero.pandaImage}
                    onChange={(event) => updateHero("pandaImage", event.target.value)}
                  >
                    {pandaOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </TextField>
                  <TextField label="Panda image alt text" value={draft.hero.imageAlt} onChange={(event) => updateHero("imageAlt", event.target.value)} />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <FormControlLabel
                    control={<Checkbox checked={Boolean(draft.hero.showLavender)} onChange={(event) => updateHero("showLavender", event.target.checked)} />}
                    label="Show lavender"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={Boolean(draft.hero.showFlowers)} onChange={(event) => updateHero("showFlowers", event.target.checked)} />}
                    label="Show flowers"
                  />
                </Stack>
              </Stack>

              <Divider />

              <Stack spacing={2}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} justifyContent="space-between">
                  <Box>
                    <Typography variant="h3">Bubbles</Typography>
                    <Typography color="text.secondary">Each bubble becomes one card under the hero.</Typography>
                  </Box>
                  <Button startIcon={<AddIcon />} onClick={addBubble} disabled={draft.bubbles.length >= 6}>
                    Add bubble
                  </Button>
                </Stack>
                {draft.bubbles.map((bubble, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 2, boxShadow: "none" }}>
                    <Stack spacing={1.5}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                        <TextField
                          select
                          label="Icon"
                          value={bubble.icon}
                          onChange={(event) => updateBubble(index, "icon", event.target.value)}
                          sx={{ minWidth: { sm: 180 } }}
                        >
                          {iconOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                          ))}
                        </TextField>
                        <TextField label="Bubble title" value={bubble.title} onChange={(event) => updateBubble(index, "title", event.target.value)} />
                        <IconButton onClick={() => removeBubble(index)} aria-label="Remove bubble">
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                      <TextField label="Bubble text" value={bubble.text} onChange={(event) => updateBubble(index, "text", event.target.value)} multiline minRows={2} />
                    </Stack>
                  </Paper>
                ))}
              </Stack>

              <Divider />

              <Stack spacing={2}>
                <Typography variant="h3">Bottom section</Typography>
                <TextField label="Heading" value={draft.cta.title} onChange={(event) => updateCta("title", event.target.value)} />
                <TextField label="Text" value={draft.cta.text} onChange={(event) => updateCta("text", event.target.value)} multiline minRows={3} />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField label="Button label" value={draft.cta.buttonLabel} onChange={(event) => updateCta("buttonLabel", event.target.value)} />
                  <TextField label="Button link" value={draft.cta.buttonTo} onChange={(event) => updateCta("buttonTo", event.target.value)} />
                </Stack>
              </Stack>

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button onClick={() => setEditing(false)}>Cancel</Button>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={save}>Save home page</Button>
              </Stack>
            </Stack>
          </Paper>
        </AnimatedSection>
      )}

      <Grid container spacing={2.5}>
        {page.bubbles.map((item, index) => (
          <Grid item xs={12} md={4} key={`${item.title}-${index}`}>
            <AnimatedSection delay={index * 100}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  height: "100%",
                  borderTop: "3px solid",
                  borderTopColor: "secondary.main",
                  boxShadow: "0 18px 52px rgba(199, 146, 255, 0.16)",
                }}
              >
                <Stack spacing={2}>
                  <Box sx={{ color: "secondary.main" }}><BubbleIcon type={item.icon} /></Box>
                  <Typography variant="h4" sx={(theme) => ({ fontFamily: theme.typography.monoFontFamily })}>{decodeDisplayText(item.title)}</Typography>
                  <Typography color="text.secondary" sx={{ fontSize: "1.06rem", lineHeight: 1.68 }}>{decodeDisplayText(item.text)}</Typography>
                </Stack>
              </Paper>
            </AnimatedSection>
          </Grid>
        ))}
      </Grid>

      <AnimatedSection>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 5 } }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h2" color="blog.subheading">{decodeDisplayText(page.cta.title)}</Typography>
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                {decodeDisplayText(page.cta.text)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button component={RouterLink} to={page.cta.buttonTo} fullWidth size="large" variant="contained">
                {decodeDisplayText(page.cta.buttonLabel)}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </AnimatedSection>
    </Stack>
  );
}
