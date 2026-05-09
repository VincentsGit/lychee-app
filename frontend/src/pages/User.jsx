import { useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { Alert, Box, Button, Chip, Divider, Paper, Stack, Typography } from "@mui/material";
import AnimatedSection from "../components/AnimatedSection";
import UserAvatar from "../components/UserAvatar";
import { api } from "../components/api";
import { decodeDisplayText } from "../components/displayText";

function postPath(comment) {
  const title = decodeDisplayText(comment.post.title).replace(/\s+/g, "-").toLowerCase();
  return `/blog/${comment.post.id}/${encodeURIComponent(title)}`;
}

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
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h2" color="blog.subheading">Comments</Typography>
              <Typography color="text.secondary">
                {(profile.comments || []).length} {(profile.comments || []).length === 1 ? "comment" : "comments"} from this user
              </Typography>
            </Box>

            {(profile.comments || []).length ? (
              <Stack divider={<Divider flexItem />} spacing={2.5}>
                {profile.comments.map((comment) => (
                  <Box key={comment.id}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "baseline" }} justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        {comment.replyingTo ? `Replying to @${comment.replyingTo.username}` : "Comment"} · {new Date(comment.createdAt).toLocaleString()}
                      </Typography>
                      <Button component={RouterLink} to={postPath(comment)} variant="text" size="small" sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}>
                        View post
                      </Button>
                    </Stack>
                    <Typography sx={{ mt: 1, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{decodeDisplayText(comment.content)}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                      On {decodeDisplayText(comment.post.title)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">No comments yet.</Typography>
            )}
          </Stack>
        </Paper>
      </AnimatedSection>
    </Stack>
  );
}
