import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from '@tiptap/extension-text-style';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Container,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Image from '@tiptap/extension-image';
import Youtube from "@tiptap/extension-youtube";
import EditorToolbar from "../components/EditorToolbar";

export default function Create() {
  const navigate = useNavigate();
  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(res => !res.ok && navigate("/"));
  }, []);
  const theme = useTheme();
  const [title, setTitle] = useState("");

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();

      if (data.url) {
        editor.chain().focus().setImage({ src: data.url }).run();
      }
    } catch (err) {
      console.error("Image upload failed", err);
    }
  };

  const editor = useEditor({
    extensions: [StarterKit,
      TextStyle,
      Image,
      Youtube.configure({
        controls: true,
        nocookie: true,
      }),],

    editorProps: {
      editorProps: {
        handlePaste(view, event) {
          const items = event.clipboardData?.items;
          if (!items) return false;

          for (const item of items) {
            if (item.type.startsWith("image/")) {
              event.preventDefault();

              const file = item.getAsFile();
              if (file) uploadImage(file);

              return true;
            }
          }

          return false;
        },



        handleDrop(view, event) {
          const files = event.dataTransfer?.files;
          if (!files?.length) return false;

          for (const file of files) {
            if (file.type.startsWith("image/")) {
              event.preventDefault();
              uploadImage(file);
              return true;
            }
          }

          return false;
        },
      },



    },
    content: "",
  });

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!editor) return;

  const blogPost = {
    title,
    content: editor.getHTML(),
  };

  try {
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(blogPost),
    });

    if (!res.ok) {
      throw new Error("Failed to create post");
    }

    const savedPost = await res.json();
    navigate("/blog/" + savedPost.id + "/" + encodeURIComponent(savedPost.title.replace(/\s+/g, '-').toLowerCase()));
  } catch (err) {
    console.error("Error submitting post:", err);
  }
};

  return (
    <Container sx={{ mt: { xs: 0, md: 4, overflowX: 'hidden' } }}>
      <Typography variant="h2" color="blog.subheading">
        Create a Post
      </Typography>

      <Box sx={{ maxWidth: '100vw', p: 2, mt: 4 }}>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                required
                margin="normal"
              />

              <Box
                sx={{
                  mt: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                }}
              >
                <EditorToolbar editor={editor} uploadImage={uploadImage} />

                <Box
                  sx={{
                    p: 2,
                    minHeight: 100,

                    "& .ProseMirror": {
                      outline: "none",
                      fontFamily: theme.typography.body1.fontFamily,
                      fontSize: theme.typography.body1.fontSize,
                      lineHeight: theme.typography.body1.lineHeight,
                    },

                    "& .ProseMirror strong": {
                      fontWeight: theme.typography.fontWeightBold,
                    },

                    "& .ProseMirror em": {
                      fontStyle: "italic",
                    },

                    "& .ProseMirror h2": {
                      ...theme.typography.h2,
                      color: theme.palette.blog.subheading,
                    },
                    "& .ProseMirror h3": {
                      ...theme.typography.h3,
                      color: theme.palette.blog.subheading,
                    },

                    "& .ProseMirror ul": {
                      paddingLeft: "1.5rem",
                      listStyleType: "disc",
                    },

                    "& .ProseMirror ol": {
                      paddingLeft: "1.5rem",
                      listStyleType: "decimal",
                    },
                    "& .ProseMirror img": {
                      display: "block",
                      marginLeft: "auto",
                      marginRight: "auto",
                      maxWidth: "75%",
                      height: "auto",
                    },

                    "& .ProseMirror iframe": {
                      display: "block",
                      marginLeft: "auto",
                      marginRight: "auto",
                      width: "100%",
                      maxWidth: "800px",
                      aspectRatio: "16 / 9",
                      height: "auto",
                    },

                    "& .ProseMirror a": {
                      cursor: "pointer",
                      color: theme.palette.blog.link,
                    },

                    "& .ProseMirror a:hover": {
                      color: theme.palette.blog.linkHover,
                    },


                  }}
                >
                  <EditorContent editor={editor} />
                </Box>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 4 }}>
                <Button type="submit" variant="contained">
                  Publish
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}