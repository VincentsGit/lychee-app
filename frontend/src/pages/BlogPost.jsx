import { useCallback, useEffect, useState } from "react";
import SendIcon from "@mui/icons-material/Send";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Divider, Paper, Stack, TextField, Typography } from "@mui/material";
import AnimatedSection from "../components/AnimatedSection";
import BlogPostContent from "../components/BlogPostContent";
import UserAvatar from "../components/UserAvatar";
import { api } from "../components/api";
import { decodeDisplayText } from "../components/displayText";

export default function BlogPost({ user }) {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadComments = useCallback(() => api(`/api/posts/${postId}/comments`).then(setComments), [postId]);

  useEffect(() => {
    Promise.all([
      api(`/api/posts/${postId}`).then(setPost),
      loadComments(),
    ])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [postId, loadComments]);

  const submitComment = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api(`/api/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: comment }),
      });
      setComment("");
      await loadComments();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (!post) {
    return (
      <Stack spacing={2}>
        <Typography variant="h1" color="blog.subheading">Oops! Post not found.</Typography>
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    );
  }

  if (post.status === "draft") {
    const canEdit = user?.username === "runitrench";
    return (
      <Stack spacing={3}>
        <AnimatedSection>
          <Box>
            <Typography variant="h1" color="blog.subheading">{decodeDisplayText(post.title)}</Typography>
            <Typography color="text.secondary">
              This page is still being finished.
            </Typography>
          </Box>
        </AnimatedSection>
        <Alert severity="warning">
          This post is autosaved as a draft and needs completing before it is published.
        </Alert>
        {canEdit && (
          <Button variant="contained" onClick={() => navigate(`/edit/${post.id}`)} sx={{ alignSelf: "flex-start" }}>
            Continue editing
          </Button>
        )}
      </Stack>
    );
  }

  return (
    <Stack spacing={4}>
      <AnimatedSection>
        <Box>
          <Typography variant="h1" color="blog.subheading">{decodeDisplayText(post.title)}</Typography>
          <Typography color="text.secondary">
            {new Date(post.createdAt).toLocaleString()}
          </Typography>
        </Box>
      </AnimatedSection>

      <AnimatedSection delay={80}>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 5 } }}>
          <BlogPostContent content={post.content} />
        </Paper>
      </AnimatedSection>

      <AnimatedSection delay={120}>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h2" color="blog.subheading">Comments</Typography>
              <Typography color="text.secondary">{comments.length} messages on this post</Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            {user ? (
              <Box component="form" onSubmit={submitComment}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
                  <UserAvatar user={user} />
                  <TextField
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Write a comment..."
                    multiline
                    minRows={2}
                    fullWidth
                    inputProps={{ maxLength: 1200 }}
                  />
                  <Button type="submit" variant="contained" endIcon={<SendIcon />} disabled={!comment.trim()}>
                    Send
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Alert severity="info">
                <Button component={RouterLink} to="/login">Login</Button> or <Button component={RouterLink} to="/register">register</Button> to comment.
              </Alert>
            )}

            <Divider />

            <Stack spacing={2}>
              {comments.map((item) => (
                <Box key={item.id} sx={{ display: "flex", gap: 2 }}>
                  <UserAvatar user={item.user} />
                  <Box sx={{ flex: 1 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "baseline" }}>
                      <Button component={RouterLink} to={`/users/${item.user.id}`} sx={{ p: 0, minWidth: 0, fontWeight: 800 }}>
                        {decodeDisplayText(item.user.displayName)}
                      </Button>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(item.createdAt).toLocaleString()}
                      </Typography>
                    </Stack>
                    <Typography sx={{ whiteSpace: "pre-wrap" }}>{decodeDisplayText(item.content)}</Typography>
                  </Box>
                </Box>
              ))}
              {!comments.length && <Typography color="text.secondary">No comments yet.</Typography>}
            </Stack>
          </Stack>
        </Paper>
      </AnimatedSection>
    </Stack>
  );
}
