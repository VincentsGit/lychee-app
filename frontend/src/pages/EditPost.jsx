import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from "@tiptap/extension-youtube";
import EditorToolbar from "../components/EditorToolbar"; 
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

// Utility to extract all image src URLs from HTML
function extractImageUrls(html) {
  const regex = /<img[^>]+src="([^">]+)"/g;
  const urls = [];
  let match;
  while ((match = regex.exec(html))) {
    urls.push(match[1]);
  }
  return urls;
}

export default function EditPost() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();

  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [originalImages, setOriginalImages] = useState([]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Underline,
      Link,
      Image,
      Youtube.configure({ controls: true, nocookie: true }),
    ],
    content: "",
    onUpdate: () => setIsDirty(true),
  });

  // Check auth first
  useEffect(() => {
    fetch("http://localhost:5000/me", { credentials: "include" })
      .then(res => {
        if (!res.ok) navigate("/");
        return res.json();
      })
      .catch(() => navigate("/"));
  }, [navigate]);

  // Fetch post content
  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await fetch(`http://localhost:5000/posts/${postId}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch post");
        const data = await res.json();
        setTitle(data.title);
        editor?.commands.setContent(data.content);

        const imgs = extractImageUrls(data.content).filter(src =>
          src.includes("/uploads/")
        );
        setOriginalImages(imgs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (editor) fetchPost();
  }, [postId, editor]);

  // Warn user if leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleSave = async () => {
    if (!editor) return;
    const content = editor.getHTML();
    const updatedPost = { title, content };

    try {
      // Determine which original images were removed
      const currentImages = extractImageUrls(content).filter(src =>
        src.includes("/uploads/")
      );
      const removedImages = originalImages.filter(img => !currentImages.includes(img));

      // Send PUT request to update post
      const res = await fetch(`http://localhost:5000/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updatedPost),
      });
      if (!res.ok) throw new Error("Failed to update post");

      // Delete removed images from server
      for (const imgUrl of removedImages) {
        const filename = imgUrl.split("/uploads/")[1];
        await fetch(`http://localhost:5000/uploads/${filename}`, {
          method: "DELETE",
          credentials: "include",
        });
      }

      setIsDirty(false);
      navigate(`/blog/${postId}/${encodeURIComponent(title.replace(/\s+/g, '-').toLowerCase())}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm("All unsaved changes will be lost. Continue?")) return;
    navigate(-1);
  };

  if (loading) return (
    <Container sx={{ mt: { xs: 0, md: 4 } }}>
      <Typography>Loading...</Typography>
    </Container>
  );

  return (
    <Container sx={{ mt: { xs: 0, md: 4, overflowX: 'hidden' } }}>
      <Typography variant="h2" color="blog.subheading">
        Edit Post
      </Typography>

      <Box sx={{ maxWidth: '100vw', p: 2, mt: 4 }}>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box component="form">
              <TextField
                label="Title"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
                fullWidth
                required
                margin="normal"
              />

              <Box sx={{ mt: 3, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <EditorToolbar editor={editor} uploadImage={async (file) => {
                  const formData = new FormData();
                  formData.append("file", file);
                  const res = await fetch("http://localhost:5000/upload", {
                    method: "POST",
                    body: formData,
                    credentials: "include",
                  });
                  const data = await res.json();
                  if (data.url) editor.chain().focus().setImage({ src: data.url }).run();
                }} />

                <Box sx={{
                  p: 2,
                  minHeight: 100,
                  "& .ProseMirror": {
                    outline: "none",
                    fontFamily: theme.typography.body1.fontFamily,
                    fontSize: theme.typography.body1.fontSize,
                    lineHeight: theme.typography.body1.lineHeight,
                  },
                  "& .ProseMirror strong": { fontWeight: theme.typography.fontWeightBold },
                  "& .ProseMirror em": { fontStyle: "italic" },
                  "& .ProseMirror h2": { ...theme.typography.h2, color: theme.palette.blog.subheading },
                  "& .ProseMirror h3": { ...theme.typography.h3, color: theme.palette.blog.subheading },
                  "& .ProseMirror ul": { paddingLeft: "1.5rem", listStyleType: "disc" },
                  "& .ProseMirror ol": { paddingLeft: "1.5rem", listStyleType: "decimal" },
                  "& .ProseMirror img": { display: "block", marginLeft: "auto", marginRight: "auto", maxWidth: "75%", height: "auto" },
                  "& .ProseMirror iframe": { display: "block", marginLeft: "auto", marginRight: "auto", width: "100%", maxWidth: "800px", aspectRatio: "16 / 9", height: "auto" },
                  "& .ProseMirror a": { cursor: "pointer", color: theme.palette.blog.link },
                  "& .ProseMirror a:hover": { color: theme.palette.blog.linkHover },
                }}>
                  <EditorContent editor={editor} />
                </Box>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 4, gap: 2 }}>
                <Button variant="outlined" onClick={handleCancel}>Cancel</Button>
                <Button variant="contained" onClick={handleSave}>Save</Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
