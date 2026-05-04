import { useEffect, useMemo, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import { Box, Button, Chip, IconButton, Paper, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import AnimatedSection from "../components/AnimatedSection";
import { api } from "../components/api";
import { decodeDisplayText } from "../components/displayText";

const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "long" });

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function Blog({ user }) {
  const [posts, setPosts] = useState([]);
  const navigate = useNavigate();
  const canEdit = user?.username === "runitrench";

  useEffect(() => {
    api("/api/posts")
      .then((data) => setPosts(data.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))))
      .catch((err) => console.error("Failed to fetch posts:", err));
  }, []);

  const grouped = useMemo(() => {
    return posts.reduce((acc, post) => {
      const date = new Date(post.createdAt);
      const year = date.getFullYear();
      const month = monthKey(date);
      acc[year] ||= {};
      acc[year][month] ||= {
        label: monthFormatter.format(date),
        posts: [],
      };
      acc[year][month].posts.push(post);
      return acc;
    }, {});
  }, [posts]);

  const handleClick = (post) => {
    if (post.status === "draft") {
      if (canEdit) navigate(`/edit/${post.id}`);
      return;
    }
    const { id, title } = post;
    navigate(`/blog/${id}/${encodeURIComponent(decodeDisplayText(title).replace(/\s+/g, "-").toLowerCase())}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    await api(`/api/posts/${id}`, { method: "DELETE" });
    setPosts(posts.filter((post) => post.id !== id));
  };

  return (
    <Stack spacing={4}>
      <AnimatedSection>
        <Box>
          <Typography variant="h1" color="blog.subheading">Blog</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 720 }}>
            All my posts live here, sorted by year and month so they are easy to find again.
          </Typography>
        </Box>
      </AnimatedSection>

      {Object.keys(grouped).sort((a, b) => b - a).map((year) => (
        <AnimatedSection key={year}>
          <Stack spacing={2.5}>
            <Typography variant="h2">{year}</Typography>
            {Object.keys(grouped[year]).sort((a, b) => b.localeCompare(a)).map((month) => (
              <Paper key={`${year}-${month}`} elevation={0} sx={{ p: { xs: 2.5, md: 3.5 } }}>
                <Typography variant="h3" color="blog.subheading" sx={{ mb: 2 }}>{grouped[year][month].label}</Typography>
                <Stack spacing={1.5}>
                  {grouped[year][month].posts.map((post) => (
                    <Box
                      key={post.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: 2,
                        opacity: post.status === "draft" ? 0.58 : 1,
                        border: post.status === "draft" ? "1px dashed" : "1px solid transparent",
                        borderColor: post.status === "draft" ? "divider" : "transparent",
                        transition: "background-color 180ms ease, transform 180ms ease",
                        "&:hover": { bgcolor: "action.hover", transform: "translateX(4px)" },
                      }}
                    >
                      <Button
                        onClick={() => handleClick(post)}
                        disabled={post.status === "draft" && !canEdit}
                        sx={{ flex: 1, justifyContent: "flex-start", textAlign: "left" }}
                      >
                        <Stack alignItems="flex-start">
                          <Typography fontWeight={800}>{decodeDisplayText(post.title)}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(post.updatedAt || post.createdAt).toLocaleDateString()}
                          </Typography>
                        </Stack>
                      </Button>
                      {post.status === "draft" ? (
                        <Chip label="Needs finishing" size="small" variant="outlined" />
                      ) : (
                        <Chip icon={<ChatBubbleOutlineIcon />} label={post.commentCount || 0} size="small" variant="outlined" />
                      )}
                      {canEdit && (
                        <Stack direction="row">
                          <IconButton onClick={() => navigate(`/edit/${post.id}`)} aria-label="Edit post"><EditIcon /></IconButton>
                          <IconButton onClick={() => handleDelete(post.id)} aria-label="Delete post"><DeleteIcon /></IconButton>
                        </Stack>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Paper>
            ))}
          </Stack>
        </AnimatedSection>
      ))}
    </Stack>
  );
}
