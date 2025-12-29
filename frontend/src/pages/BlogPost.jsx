import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Container, Typography, Box, CircularProgress } from "@mui/material";
import BlogPostContent from "../components/BlogPostContent";

export default function BlogPost() {
  const { postId, postTitle } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await fetch(`/api/posts/${postId}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch post");

        const data = await res.json();
        setPost(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchPost();
  }, [postId]);

  if (loading) {
    return (
      <Container sx={{ mt: { xs: 0, md: 4 } }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!post) {
    return (
      <Container sx={{ mt: { xs: 0, md: 4 } }}>
        <Typography variant="h2" color="blog.subheading">Oops! Post not found!</Typography>
        <Typography variant="body1" sx={{ mt: 4 }}>Did you copy the link correctly?</Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: { xs: 0, md: 4 } }}>
      <Typography variant="h2" sx={{ mb: 2 }} color="blog.subheading">
        {post.title}
      </Typography>
      <Typography variant="subtitle2" sx={{ mb: 4, color: "text.secondary" }}>
        {new Date(post.createdAt).toLocaleString()}
        {/* {post.updatedAt && ` - Updated at ${new Date(post.updatedAt).toLocaleString()}`} */}
      </Typography>
      <BlogPostContent content={post.content} />
    </Container>
  );
}
