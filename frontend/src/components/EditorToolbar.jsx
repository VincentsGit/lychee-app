import { useRef } from "react";
import {
  Box,
  IconButton,
  Typography,
  Tooltip,
} from "@mui/material";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import StrikethroughSIcon from "@mui/icons-material/StrikethroughS";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";
import ImageIcon from '@mui/icons-material/Image';

export default function EditorToolbar({ editor, uploadImage }) {
  const fileInputRef = useRef(null);
  if (!editor) return null;

  const headingLevels = [2, 3];

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;

    for (const file of files) {
      await uploadImage(file);
    }

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

      <Tooltip title="Insert YouTube Video">
        <IconButton
          onClick={() => {
            const url = window.prompt(
              "Paste YouTube URL (https://www.youtube.com/watch?v=...)"
            );
            if (!url) return;

            editor
              .chain()
              .focus()
              .setYoutubeVideo({
                src: url,
                width: 640,
                height: 360,
              })
              .run();
          }}
        >
          <OndemandVideoIcon />
        </IconButton>
      </Tooltip>

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
