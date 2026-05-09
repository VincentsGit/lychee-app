import { useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import AnimatedSection from "../components/AnimatedSection";
import UserAvatar from "../components/UserAvatar";
import { api } from "../components/api";
import { decodeDisplayText } from "../components/displayText";

export default function User() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/api/users/${userId}`)
      .then(setProfile)
      .catch((err) => setError(err.message));
  }, [userId]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!profile) return null;

  return (
    <Stack spacing={3}>
      <AnimatedSection>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 5 } }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems={{ md: "center" }}>
            <UserAvatar user={profile} size={116} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h1" color="blog.subheading">{decodeDisplayText(profile.displayName)}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                <Chip label={`@${profile.username}`} />
                <Chip label={`Joined ${new Date(profile.createdAt).toLocaleDateString()}`} variant="outlined" />
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </AnimatedSection>

      <AnimatedSection delay={120}>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 4 } }}>
          <Typography variant="h2" color="blog.subheading">Recent comment</Typography>
          {profile.recentComment ? (
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ whiteSpace: "pre-wrap" }}>{decodeDisplayText(profile.recentComment.content)}</Typography>
              <Typography variant="caption" color="text.secondary">
                On {new Date(profile.recentComment.createdAt).toLocaleString()}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Button
                  component={RouterLink}
                  to={`/blog/${profile.recentComment.post.id}/${encodeURIComponent(decodeDisplayText(profile.recentComment.post.title).replace(/\s+/g, "-").toLowerCase())}`}
                  variant="outlined"
                >
                  View post
                </Button>
              </Box>
            </Box>
          ) : (
            <Typography sx={{ mt: 2 }} color="text.secondary">No comments yet.</Typography>
          )}
        </Paper>
      </AnimatedSection>
    </Stack>
  );
}
