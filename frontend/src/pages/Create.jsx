import { useCallback, useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import {
  Box,
  Button,
  Card,
  CardContent,
  Alert,
  TextField,
  Typography,
  Container,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Image from '@tiptap/extension-image';
import Youtube from "@tiptap/extension-youtube";
import EditorToolbar from "../components/EditorToolbar";

const AUTOSAVE_INTERVAL_MS = 60 * 1000;

export default function Create() {
  const navigate = useNavigate();
  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(res => {
        if (!res.ok) {
          navigate("/");
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data && data.user?.username !== "runitrench") navigate("/");
      })
      .catch(() => navigate("/"));
  }, [navigate]);
  const theme = useTheme();
  const [title, setTitle] = useState("");
  const [draftId, setDraftId] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState("Autosaves every minute");

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
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      Youtube.configure({
        controls: true,
        nocookie: true,
      }),],

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
    content: "",
    onUpdate: () => setIsDirty(true),
  });

  const savePost = useCallback(async (status) => {
    if (!editor) return null;
    const content = editor.getHTML();
    const hasDraftContent = title.trim() || editor.getText().trim() || content.includes("<img") || content.includes("iframe");
    if (status === "draft" && !hasDraftContent) return null;

    const blogPost = { title, content, status };
    const url = draftId ? `/api/posts/${draftId}` : "/api/posts";
    const method = draftId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(blogPost),
    });

    if (!res.ok) {
      throw new Error(status === "draft" ? "Failed to autosave draft" : "Failed to create post");
    }

    return res.json();
  }, [draftId, editor, title]);

  useEffect(() => {
    if (!editor) return undefined;

    const autosave = async () => {
      if (!isDirty) return;
      setAutosaveStatus("Autosaving...");
      try {
        const savedPost = await savePost("draft");
        if (!savedPost) {
          setAutosaveStatus("Autosaves every minute");
          return;
        }
        setDraftId(savedPost.id);
        setIsDirty(false);
        setAutosaveStatus(`Draft saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
      } catch (err) {
        console.error("Autosave failed:", err);
        setAutosaveStatus("Autosave could not save");
      }
    };

    const intervalId = window.setInterval(autosave, AUTOSAVE_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [editor, isDirty, savePost]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const savedPost = await savePost("published");
      if (!savedPost) return;
      setIsDirty(false);
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
                onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
                fullWidth
                required
                margin="normal"
              />
              <Alert severity="info" sx={{ mt: 2 }}>
                {autosaveStatus}
              </Alert>

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
