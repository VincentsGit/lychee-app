import { useEffect, useMemo, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { Box, Container, IconButton, List, ListItem, ListItemButton, ListItemText, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { api } from "../components/api";
import { decodeDisplayText } from "../components/displayText";

function slugFor(title) {
  return encodeURIComponent(decodeDisplayText(title).replace(/\s+/g, "-").toLowerCase());
}

export default function LegacyBlog({ user }) {
  const [posts, setPosts] = useState([]);
  const navigate = useNavigate();
  const canEdit = user?.username === "runitrench";

  useEffect(() => {
    api("/api/posts")
      .then((data) => {
        const visiblePosts = data
          .filter((post) => post.status === "published")
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setPosts(visiblePosts);
      })
      .catch((err) => console.error("Failed to fetch legacy posts:", err));
  }, []);

  const postsByYear = useMemo(() => posts.reduce((acc, post) => {
    const year = new Date(post.createdAt).getFullYear();
    acc[year] ||= [];
    acc[year].push(post);
    return acc;
  }, {}), [posts]);

  const years = Object.keys(postsByYear).sort((a, b) => Number(b) - Number(a));

  const handleDelete = async (event, id) => {
    event.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    await api(`/api/posts/${id}`, { method: "DELETE" });
    setPosts((current) => current.filter((post) => post.id !== id));
  };

  return (
    <Container sx={{ mt: { xs: 0, md: 4 } }}>
      <Typography variant="h2" color="blog.subheading">Blog</Typography>
      <Stack spacing={4} sx={{ mt: 4 }}>
        {years.map((year) => (
          <Box key={year}>
            <Typography variant="h3" color="blog.subheading" sx={{ mb: 1.5 }}>{year}</Typography>
            <List disablePadding>
              {postsByYear[year].map((post) => (
                <ListItem
                  key={post.id}
                  disablePadding
                  secondaryAction={canEdit ? (
                    <Stack direction="row">
                      <IconButton edge="end" aria-label="Edit post" onClick={() => navigate(`/edit/${post.id}`)}><EditIcon /></IconButton>
                      <IconButton edge="end" aria-label="Delete post" onClick={(event) => handleDelete(event, post.id)}><DeleteIcon /></IconButton>
                    </Stack>
                  ) : null}
                >
                  <ListItemButton onClick={() => navigate(`/blog/${post.id}/${slugFor(post.title)}`)}>
                    <ListItemText
                      primary={`${new Date(post.createdAt).toLocaleDateString()} - ${decodeDisplayText(post.title)}`}
                      primaryTypographyProps={{ sx: { overflowWrap: "anywhere", wordBreak: "break-word" } }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        ))}
      </Stack>
    </Container>
  );
}
