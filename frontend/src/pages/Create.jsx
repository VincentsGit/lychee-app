import { useState, useRef } from "react";
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
  IconButton,
  TextField,
  Typography,
  Tooltip,
  Container,
} from "@mui/material";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import StrikethroughSIcon from "@mui/icons-material/StrikethroughS";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import { useTheme } from "@mui/material/styles";
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import Image from '@tiptap/extension-image';
import ImageIcon from '@mui/icons-material/Image';

function EditorToolbar({ editor }) {
  if (!editor) return null;
  const fileInputRef = useRef(null);

  const headingLevels = [2, 3];


  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("http://localhost:5000/upload", {
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
    }

    // Reset input
    e.target.value = "";
  };


  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        borderBottom: "1px solid",
        borderColor: "divider",
        p: 1,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <Tooltip title="Bold">
        <IconButton onClick={() => editor.chain().focus().toggleBold().run()}
          color={editor.isActive("bold") ? "primary" : "default"}
        >
          <FormatBoldIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Underline">
        <IconButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          color={editor.isActive("underline") ? "primary" : "default"}
        >
          <FormatUnderlinedIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Italic">
        <IconButton onClick={() => editor.chain().focus().toggleItalic().run()}
          color={editor.isActive("italic") ? "primary" : "default"}
        >
          <FormatItalicIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Strikethrough">
        <IconButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          color={editor.isActive("strike") ? "primary" : "default"}
        >
          <StrikethroughSIcon />
        </IconButton>
      </Tooltip>

      {headingLevels.map((level) => (
        <Tooltip key={level} title={`Heading ${level}`}>
          <IconButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level }).run()
            }
            color={editor.isActive("heading", { level }) ? "primary" : "default"}
          >
            <Typography fontWeight={700}>H{level}</Typography>
          </IconButton>
        </Tooltip>
      ))}

      <Tooltip title="Bullet List">
        <IconButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          color={editor.isActive("bulletList") ? "primary" : "default"}
        >
          <FormatListBulletedIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Numbered List">
        <IconButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          color={editor.isActive("orderedList") ? "primary" : "default"}
        >
          <FormatListNumberedIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Add/Edit Link">
        <IconButton
          onClick={() => {
            const previousUrl = editor.getAttributes('link').href;
            const url = window.prompt('Enter URL', previousUrl);
            if (url === null) return; // cancel
            if (url === '') {
              editor.chain().focus().unsetLink().run();
              return;
            }
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          }}
          color={editor.isActive('link') ? 'primary' : 'default'}
        >
          {editor.isActive('link') ? <LinkOffIcon /> : <LinkIcon />}
        </IconButton>
      </Tooltip>


      <Tooltip title="Insert Image">
        <IconButton onClick={() => fileInputRef.current.click()}>
          <ImageIcon />
        </IconButton>
      </Tooltip>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleImageUpload}
        multiple
      />


      <Tooltip title="Undo">
        <IconButton onClick={() => editor.chain().focus().undo().run()}>
          <UndoIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Redo">
        <IconButton onClick={() => editor.chain().focus().redo().run()}>
          <RedoIcon />
        </IconButton>
      </Tooltip>

    </Box>
  );
}

export default function Create() {
  const theme = useTheme();
  const [title, setTitle] = useState("");

  const editor = useEditor({
    extensions: [StarterKit, TextStyle, Underline, Link, Image],
    content: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const blogPost = {
      title,
      content: editor.getHTML(),
      createdAt: new Date().toISOString(),
    };

    console.log("Submitted blog post:", blogPost);
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
                <EditorToolbar editor={editor} />

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
                      maxWidth: "100%",
                      height: "auto",
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