import { useEffect, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import InstagramIcon from "@mui/icons-material/Instagram";
import LinkIcon from "@mui/icons-material/Link";
import SaveIcon from "@mui/icons-material/Save";
import XIcon from "@mui/icons-material/X";
import YouTubeIcon from "@mui/icons-material/YouTube";
import { Alert, Box, Button, Chip, IconButton, MenuItem, Paper, Stack, SvgIcon, TextField, Typography } from "@mui/material";
import AnimatedSection from "../components/AnimatedSection";
import { api } from "../components/api";
import { decodeDisplayText } from "../components/displayText";

const defaultSocials = {
  title: "Socials",
  subtitle: "Follow me on my socials!",
  links: [
    { label: "X", href: "https://x.com/runitrench", icon: "x" },
    { label: "Instagram", href: "https://www.instagram.com/runitrench", icon: "instagram" },
    { label: "TikTok", href: "https://www.tiktok.com/@runitrench", icon: "tiktok" },
    { label: "Twitch", href: "https://www.twitch.tv/runitrench", icon: "twitch" },
    { label: "YouTube", href: "https://www.youtube.com/@runitrench", icon: "youtube" },
  ],
};

const emptyLink = { label: "", href: "", icon: "link" };

function TikTokIcon(props) {
  return (
    <SvgIcon {...props} viewBox="12 4 26 42">
      <path d="M41,4H9C6.243,4,4,6.243,4,9v32c0,2.757,2.243,5,5,5h32c2.757,0,5-2.243,5-5V9C46,6.243,43.757,4,41,4z M37.006,22.323 c-0.227,0.021-0.457,0.035-0.69,0.035c-2.623,0-4.928-1.349-6.269-3.388c0,5.349,0,11.435,0,11.537c0,4.709-3.818,8.527-8.527,8.527 s-8.527-3.818-8.527-8.527s3.818-8.527,8.527-8.527c0.178,0,0.352,0.016,0.527,0.027v4.202c-0.175-0.021-0.347-0.053-0.527-0.053 c-2.404,0-4.352,1.948-4.352,4.352s1.948,4.352,4.352,4.352s4.527-1.894,4.527-4.298c0-0.095,0.042-19.594,0.042-19.594h4.016 c0.378,3.591,3.277,6.425,6.901,6.685V22.323z" />
    </SvgIcon>
  );
}

function TwitchIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 16 16">
      <path d="M3.857 0 1 2.857v10.286h3.429V16l2.857-2.857H9.57L14.714 8V0zm9.714 7.429-2.285 2.285H9l-2 2v-2H4.429V1.143h9.142z" />
      <path d="M11.857 3.143h-1.143V6.57h1.143zm-3.143 0H7.571V6.57h1.143z" />
    </SvgIcon>
  );
}

const iconOptions = [
  { value: "x", label: "X", icon: XIcon },
  { value: "instagram", label: "Instagram", icon: InstagramIcon },
  { value: "tiktok", label: "TikTok", icon: TikTokIcon },
  { value: "twitch", label: "Twitch", icon: TwitchIcon },
  { value: "youtube", label: "YouTube", icon: YouTubeIcon },
  { value: "link", label: "Link", icon: LinkIcon },
];

function iconFor(type) {
  return (iconOptions.find((item) => item.value === type) || iconOptions[5]).icon;
}

function normaliseSocials(data) {
  return {
    ...defaultSocials,
    ...(data || {}),
    links: Array.isArray(data?.links) ? data.links : defaultSocials.links,
  };
}

export default function Socials({ user }) {
  const canEdit = user?.username === "runitrench";
  const [page, setPage] = useState(defaultSocials);
  const [draft, setDraft] = useState(defaultSocials);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api("/api/socials")
      .then((data) => {
        const next = normaliseSocials(data);
        setPage(next);
        setDraft(next);
      })
      .catch((err) => setError(err.message));
  }, []);

  const startEditing = () => {
    setDraft(normaliseSocials(page));
    setStatus("");
    setError("");
    setEditing(true);
  };

  const updateLink = (index, field, value) => {
    setDraft((current) => ({
      ...current,
      links: current.links.map((link, linkIndex) => (linkIndex === index ? { ...link, [field]: value } : link)),
    }));
  };

  const addLink = () => {
    setDraft((current) => ({ ...current, links: [...current.links, { ...emptyLink }] }));
  };

  const removeLink = (index) => {
    setDraft((current) => ({ ...current, links: current.links.filter((_, linkIndex) => linkIndex !== index) }));
  };

  const save = async () => {
    setSaving(true);
    setStatus("");
    setError("");
    try {
      const saved = await api("/api/socials", {
        method: "PUT",
        body: JSON.stringify(draft),
      });
      const next = normaliseSocials(saved);
      setPage(next);
      setDraft(next);
      setEditing(false);
      setStatus("Socials saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={4}>
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
          <Stack spacing={2.2} sx={{ position: "relative" }}>
            <Chip icon={<LinkIcon />} label="find me online" color="primary" sx={{ alignSelf: "flex-start" }} />
            <Box>
              <Typography variant="h1" color="blog.subheading">{decodeDisplayText(page.title)}</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>{decodeDisplayText(page.subtitle)}</Typography>
            </Box>
            {canEdit && (
              <Button variant={editing ? "outlined" : "contained"} startIcon={editing ? <CloseIcon /> : <EditIcon />} onClick={() => (editing ? setEditing(false) : startEditing())} sx={{ alignSelf: "flex-start" }}>
                {editing ? "Cancel" : "Edit Socials"}
              </Button>
            )}
          </Stack>
        </Paper>
      </AnimatedSection>

      {(error || status) && (
        <Box>{error && <Alert severity="error">{error}</Alert>}{status && <Alert severity="success">{status}</Alert>}</Box>
      )}

      {editing && canEdit && (
        <AnimatedSection delay={60}>
          <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, borderTop: "3px solid", borderTopColor: "secondary.main" }}>
            <Stack spacing={2.4}>
              <Box>
                <Typography variant="h2" color="blog.subheading">Edit socials</Typography>
                <Typography color="text.secondary">Change the heading, text, links, and icons.</Typography>
              </Box>
              <TextField label="Title" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} fullWidth />
              <TextField label="Subtitle" value={draft.subtitle} onChange={(event) => setDraft((current) => ({ ...current, subtitle: event.target.value }))} fullWidth />
              <Stack spacing={2}>
                {draft.links.map((link, index) => (
                  <Paper key={index} elevation={0} sx={{ p: 2, bgcolor: "rgba(255,255,255,0.03)" }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
                      <TextField label="Label" value={link.label} onChange={(event) => updateLink(index, "label", event.target.value)} sx={{ flex: 1 }} />
                      <TextField label="URL" value={link.href} onChange={(event) => updateLink(index, "href", event.target.value)} sx={{ flex: 2 }} />
                      <TextField select label="Icon" value={link.icon || "link"} onChange={(event) => updateLink(index, "icon", event.target.value)} sx={{ minWidth: 150 }}>
                        {iconOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                      </TextField>
                      <IconButton color="error" onClick={() => removeLink(index)} aria-label="Remove social link"><DeleteIcon /></IconButton>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
              <Stack direction="row" spacing={1} justifyContent="space-between" flexWrap="wrap" useFlexGap>
                <Button startIcon={<AddIcon />} onClick={addLink}>Add link</Button>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving}>{saving ? "Saving..." : "Save socials"}</Button>
              </Stack>
            </Stack>
          </Paper>
        </AnimatedSection>
      )}

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        {page.links.map((link, index) => {
          const Icon = iconFor(link.icon);
          return (
            <AnimatedSection key={`${link.label}-${index}`} delay={index * 90}>
              <Paper elevation={0} sx={{ p: 2.2, minWidth: 150, borderTop: "3px solid", borderTopColor: "secondary.main" }}>
                <Stack spacing={1} alignItems="center">
                  <IconButton component="a" href={link.href} target="_blank" rel="noopener noreferrer" color="primary" aria-label={link.label} sx={{ width: 64, height: 64 }}>
                    <Icon />
                  </IconButton>
                  <Typography fontWeight={800}>{decodeDisplayText(link.label)}</Typography>
                </Stack>
              </Paper>
            </AnimatedSection>
          );
        })}
      </Stack>
    </Stack>
  );
}
