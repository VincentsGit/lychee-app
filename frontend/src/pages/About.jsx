import { useEffect, useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import Youtube from "@tiptap/extension-youtube";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AnimatedSection from "../components/AnimatedSection";
import BlogPostContent from "../components/BlogPostContent";
import EditorToolbar from "../components/EditorToolbar";
import { api } from "../components/api";
import { decodeDisplayText } from "../components/displayText";

export default function About({ user }) {
  const [page, setPage] = useState({ title: "About", content: "" });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const theme = useTheme();
  const canEdit = user?.username === "runitrench";

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      Youtube.configure({ controls: true, nocookie: true }),
    ],
    content: page.content,
  });

  useEffect(() => {
    api("/api/about")
      .then((data) => {
        setPage(data);
        editor?.commands.setContent(data.content || "");
      })
      .catch((err) => setError(err.message));
  }, [editor]);

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const data = await api("/api/upload", { method: "POST", body: formData });
    if (data.url) editor.chain().focus().setImage({ src: data.url }).run();
  };

  const save = async () => {
    try {
      const next = { title: page.title, content: editor.getHTML() };
      await api("/api/about", { method: "PUT", body: JSON.stringify(next) });
      setPage(next);
      setEditing(false);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Stack spacing={3}>
      <AnimatedSection>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ sm: "center" }}>
          <Box>
            <Typography variant="h1" color="blog.subheading">{decodeDisplayText(page.title)}</Typography>
            <Typography color="text.secondary">A little bit more about me and this website.</Typography>
          </Box>
          {canEdit && (
            <Button
              variant={editing ? "outlined" : "contained"}
              startIcon={editing ? <CloseIcon /> : <EditIcon />}
              onClick={() => setEditing((prev) => !prev)}
            >
              {editing ? "Cancel" : "Edit About"}
            </Button>
          )}
        </Stack>
      </AnimatedSection>

      {error && <Alert severity="error">{error}</Alert>}

      <AnimatedSection delay={100}>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 5 } }}>
          {editing ? (
            <Stack spacing={3}>
              <TextField label="Page title" value={page.title} onChange={(e) => setPage({ ...page, title: e.target.value })} />
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <EditorToolbar editor={editor} uploadImage={uploadImage} />
                <Box
                  sx={{
                    p: 2,
                    minHeight: 220,
                    "& .ProseMirror": {
                      outline: "none",
                      fontFamily: theme.typography.body1.fontFamily,
                      fontSize: theme.typography.body1.fontSize,
                    },
                    "& .ProseMirror img": { display: "block", maxWidth: "70%", height: "auto", mx: "auto" },
                  }}
                >
                  <EditorContent editor={editor} />
                </Box>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={save}>Save</Button>
              </Box>
            </Stack>
          ) : (
            <BlogPostContent content={page.content || ""} />
          )}
        </Paper>
      </AnimatedSection>
    </Stack>
  );
}
