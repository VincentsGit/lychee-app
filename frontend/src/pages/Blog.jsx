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
const yearFormatter = new Intl.DateTimeFormat("en-GB", { year: "numeric" });

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function Blog({ user }) {
  const [posts, setPosts] = useState([]);
  const navigate = useNavigate();
  const canEdit = user?.username === "runitrench";

  useEffect(() => {
    api("/api/posts")
      .then((data) => setPosts(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))))
      .catch((err) => console.error("Failed to fetch posts:", err));
  }, []);

  const monthCards = useMemo(() => {
    const grouped = posts.reduce((acc, post) => {
      const date = new Date(post.createdAt);
      const month = monthKey(date);
      acc[month] ||= {
        key: month,
        label: monthFormatter.format(date),
        year: yearFormatter.format(date),
        posts: [],
      };
      acc[month].posts.push(post);
      return acc;
    }, {});

    return Object.values(grouped)
      .sort((a, b) => b.key.localeCompare(a.key))
      .map((month) => ({
        ...month,
        posts: month.posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      }));
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

  const renderPost = (post) => (
    <Box
      key={post.id}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 1,
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
        sx={{
          flex: 1,
          minWidth: 0,
          justifyContent: "flex-start",
          textAlign: "left",
          px: 1,
          py: 0.75,
        }}
      >
        <Stack alignItems="flex-start" sx={{ minWidth: 0 }}>
          <Typography fontWeight={800} sx={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>
            {decodeDisplayText(post.title)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(post.createdAt).toLocaleDateString()}
          </Typography>
        </Stack>
      </Button>
      {post.status === "draft" ? (
        <Chip label="Draft" size="small" variant="outlined" sx={{ flexShrink: 0 }} />
      ) : (
        <Chip icon={<ChatBubbleOutlineIcon />} label={post.commentCount || 0} size="small" variant="outlined" sx={{ flexShrink: 0 }} />
      )}
      {canEdit && (
        <Stack direction="row" sx={{ flexShrink: 0 }}>
          <IconButton onClick={() => navigate(`/edit/${post.id}`)} aria-label="Edit post" size="small"><EditIcon fontSize="small" /></IconButton>
          <IconButton onClick={() => handleDelete(post.id)} aria-label="Delete post" size="small"><DeleteIcon fontSize="small" /></IconButton>
        </Stack>
      )}
    </Box>
  );

  const renderMonth = (month) => (
    <Paper key={month.key} elevation={0} sx={{ p: { xs: 2.25, md: 2.5 } }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h3" color="blog.subheading">{month.label}</Typography>
            <Typography variant="caption" color="text.secondary">{month.year}</Typography>
          </Box>
          <Chip label={`${month.posts.length} ${month.posts.length === 1 ? "post" : "posts"}`} size="small" variant="outlined" />
        </Stack>
        <Stack spacing={0.75}>
          {month.posts.map(renderPost)}
        </Stack>
      </Stack>
    </Paper>
  );

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

      <AnimatedSection>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
            gap: 2.5,
            alignItems: "start",
          }}
        >
          {monthCards.map(renderMonth)}
        </Box>
      </AnimatedSection>
    </Stack>
  );
}
