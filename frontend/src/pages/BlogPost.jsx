import { useCallback, useEffect, useMemo, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ReplyIcon from "@mui/icons-material/Reply";
import SendIcon from "@mui/icons-material/Send";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Divider, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import AnimatedSection from "../components/AnimatedSection";
import BlogPostContent from "../components/BlogPostContent";
import UserAvatar from "../components/UserAvatar";
import { api } from "../components/api";
import { decodeDisplayText } from "../components/displayText";

function commentTime(comment) {
  return new Date(comment.createdAt).getTime() || 0;
}

function buildCommentTree(comments, sortOrder) {
  const items = comments.map((comment) => ({ ...comment, children: [] }));
  const byId = new Map(items.map((comment) => [comment.id, comment]));
  const roots = [];

  items.forEach((comment) => {
    const parent = comment.parentId ? byId.get(comment.parentId) : null;
    if (parent) parent.children.push(comment);
    else roots.push(comment);
  });

  const direction = sortOrder === "oldest" ? 1 : -1;
  const directCompare = (a, b) => direction * (commentTime(a) - commentTime(b)) || direction * (a.id - b.id);

  roots.sort(directCompare);

  const sortReplies = (comment) => {
    comment.children.sort(directCompare);
    comment.children.forEach(sortReplies);
  };
  roots.forEach(sortReplies);
  return roots;
}

function CommentItem({
  item,
  depth = 0,
  user,
  replyingTo,
  replyText,
  onReplyTextChange,
  onReplyToggle,
  onReplyCancel,
  onReplySubmit,
}) {
  const isReplying = replyingTo === item.id;
  const displayName = decodeDisplayText(item.user.displayName);
  const indent = Math.min(depth, 4);

  return (
    <Box sx={{ ml: { xs: indent ? 1.5 : 0, sm: indent * 3 }, pl: indent ? 1.5 : 0, borderLeft: indent ? "1px solid rgba(205, 180, 255, 0.22)" : "none" }}>
      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
        <UserAvatar user={item.user} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "baseline" }}>
            <Button component={RouterLink} to={`/users/${item.user.id}`} sx={{ p: 0, minWidth: 0, fontWeight: 800 }}>
              {displayName}
            </Button>
            <Typography variant="caption" color="text.secondary">
              {new Date(item.createdAt).toLocaleString()}
            </Typography>
          </Stack>
          <Typography sx={{ mt: 0.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{decodeDisplayText(item.content)}</Typography>
          {user && (
            <Button
              size="small"
              startIcon={<ReplyIcon />}
              onClick={() => onReplyToggle(item.id, isReplying)}
              sx={{ mt: 0.75, px: 0, minWidth: 0 }}
            >
              Reply
            </Button>
          )}
          {isReplying && user && (
            <Box component="form" onSubmit={(event) => onReplySubmit(event, item.id)} sx={{ mt: 1.25 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="flex-start">
                <TextField
                  value={replyText}
                  onChange={(event) => onReplyTextChange(event.target.value)}
                  placeholder={`Reply to ${displayName}...`}
                  multiline
                  minRows={2}
                  fullWidth
                  inputProps={{ maxLength: 1200 }}
                />
                <Stack direction="row" spacing={1}>
                  <Button type="submit" variant="contained" endIcon={<SendIcon />} disabled={!replyText.trim()}>
                    Reply
                  </Button>
                  <Button onClick={onReplyCancel}>Cancel</Button>
                </Stack>
              </Stack>
            </Box>
          )}
        </Box>
      </Box>
      {item.children.length > 0 && (
        <Stack spacing={2} sx={{ mt: 2 }}>
          {item.children.map((child) => (
            <CommentItem
              key={child.id}
              item={child}
              depth={depth + 1}
              user={user}
              replyingTo={replyingTo}
              replyText={replyText}
              onReplyTextChange={onReplyTextChange}
              onReplyToggle={onReplyToggle}
              onReplyCancel={onReplyCancel}
              onReplySubmit={onReplySubmit}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default function BlogPost({ user }) {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [sortOrder, setSortOrder] = useState("newest");
  const [comment, setComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const canEdit = user?.username === "runitrench";

  const loadComments = useCallback(() => api(`/api/posts/${postId}/comments?sort=${sortOrder}`).then(setComments), [postId, sortOrder]);
  const commentTree = useMemo(() => buildCommentTree(comments, sortOrder), [comments, sortOrder]);

  useEffect(() => {
    Promise.all([
      api(`/api/posts/${postId}`).then(setPost),
      loadComments(),
    ])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [postId, loadComments]);

  const createComment = async ({ content, parentId = null }) => {
    setError("");
    await api(`/api/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content, parentId }),
    });
    await loadComments();
  };

  const submitComment = async (event) => {
    event.preventDefault();
    try {
      await createComment({ content: comment });
      setComment("");
    } catch (err) {
      setError(err.message);
    }
  };

  const submitReply = async (event, parentId) => {
    event.preventDefault();
    try {
      await createComment({ content: replyText, parentId });
      setReplyText("");
      setReplyingTo(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const deletePost = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await api(`/api/posts/${postId}`, { method: "DELETE" });
      navigate("/blog");
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleReply = (commentId, isOpen) => {
    setReplyingTo(isOpen ? null : commentId);
    setReplyText("");
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyText("");
  };

  if (loading) {
    return (
      <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, display: "flex", alignItems: "center", gap: 2 }}>
        <CircularProgress size={24} />
        <Typography color="text.secondary">Loading post...</Typography>
      </Paper>
    );
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
    <Stack spacing={4} sx={{ width: "100%", minWidth: 0, maxWidth: "100%", overflowX: "hidden" }}>
      <AnimatedSection>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-start" }} sx={{ width: "100%", minWidth: 0 }}>
          <Box sx={{ flex: 1, width: "100%", minWidth: 0, maxWidth: { xs: "calc(100vw - 32px)", sm: "100%" } }}>
            <Typography
              variant="h1"
              color="blog.subheading"
              sx={{ width: "100%", maxWidth: "100%", fontSize: { xs: "2.15rem", sm: "clamp(2.55rem, 6vw, 5.4rem)" }, overflowWrap: "anywhere", wordBreak: "break-word" }}
            >
              {decodeDisplayText(post.title)}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: { xs: 1.25, md: 2 } }}>
              {new Date(post.createdAt).toLocaleString()}
            </Typography>
          </Box>
          {canEdit && (
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/edit/${post.id}`)}>
                Edit
              </Button>
              <Button color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={deletePost}>
                Delete
              </Button>
            </Stack>
          )}
        </Stack>
      </AnimatedSection>

      <AnimatedSection delay={80}>
        <Paper elevation={0} sx={{ width: "100%", maxWidth: { xs: "calc(100vw - 32px)", sm: "100%" }, boxSizing: "border-box", p: { xs: 3, md: 5 }, minWidth: 0, overflowX: "hidden" }}>
          <BlogPostContent content={post.content} />
        </Paper>
      </AnimatedSection>

      <AnimatedSection delay={120}>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={3}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-start" }} justifyContent="space-between">
              <Box>
                <Typography variant="h2" color="blog.subheading">Comments</Typography>
                <Typography color="text.secondary">{comments.length} messages on this post</Typography>
              </Box>
              <TextField
                select
                label="Sort comments"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                sx={{ width: { xs: "100%", sm: 190 } }}
              >
                <MenuItem value="newest">Newest first</MenuItem>
                <MenuItem value="oldest">Oldest first</MenuItem>
              </TextField>
            </Stack>

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

            <Stack spacing={2.5}>
              {commentTree.map((item) => (
                <CommentItem
                  key={item.id}
                  item={item}
                  user={user}
                  replyingTo={replyingTo}
                  replyText={replyText}
                  onReplyTextChange={setReplyText}
                  onReplyToggle={toggleReply}
                  onReplyCancel={cancelReply}
                  onReplySubmit={submitReply}
                />
              ))}
              {!comments.length && <Typography color="text.secondary">No comments yet.</Typography>}
            </Stack>
          </Stack>
        </Paper>
      </AnimatedSection>
    </Stack>
  );
}
