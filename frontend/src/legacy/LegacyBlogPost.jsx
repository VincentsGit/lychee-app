import { useEffect, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { Alert, Box, Button, Container, Stack, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import BlogPostContent from "../components/BlogPostContent";
import { api } from "../components/api";
import { decodeDisplayText } from "../components/displayText";

export default function LegacyBlogPost({ user }) {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [error, setError] = useState("");
  const canEdit = user?.username === "runitrench";

  useEffect(() => {
    api(`/api/posts/${postId}`)
      .then((data) => {
        if (data.status === "draft" && !canEdit) {
          setError("Post not found");
          return;
        }
        setPost(data);
      })
      .catch((err) => setError(err.message));
  }, [canEdit, postId]);

  const deletePost = async () => {
    if (!window.confirm("Delete this post?")) return;
    await api(`/api/posts/${post.id}`, { method: "DELETE" });
    navigate("/blog");
  };

  if (error) return <Container sx={{ mt: { xs: 0, md: 4 } }}><Alert severity="error">{error}</Alert></Container>;
  if (!post) return <Container sx={{ mt: { xs: 0, md: 4 } }}><Typography>Loading...</Typography></Container>;

  return (
    <Container sx={{ mt: { xs: 0, md: 4 } }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-start" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h1" color="blog.subheading" sx={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>
            {decodeDisplayText(post.title)}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            {new Date(post.createdAt).toLocaleString()}
          </Typography>
        </Box>
        {canEdit && (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/edit/${post.id}`)}>Edit</Button>
            <Button color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={deletePost}>Delete</Button>
          </Stack>
        )}
      </Stack>
      <Box sx={{ mt: 5 }}>
        <BlogPostContent content={post.content} />
      </Box>
    </Container>
  );
}
