import { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import parse, { domToReact } from "html-react-parser";
import { Box, Dialog, DialogContent, IconButton, Typography, useTheme } from "@mui/material";

function isBlankText(node) {
  return node?.type === "text" && !String(node.data || "").trim();
}

function isMediaNode(node) {
  if (!node?.name) return false;
  if (["img", "iframe", "video"].includes(node.name)) return true;
  if (node.name === "a") return (node.children || []).some(isMediaNode);
  return false;
}

function isEmptyParagraph(node) {
  const children = node?.children || [];
  return children.length === 0 || children.every((child) => isBlankText(child) || child?.name === "br");
}

function isMediaOnlyParagraph(node) {
  const children = node?.children || [];
  return children.length > 0 && children.every((child) => isBlankText(child) || isMediaNode(child) || child?.name === "br");
}

function BlogMediaTile({ type, src, alt = "", children, onOpen, attribs = {} }) {
  const isImage = type === "image";
  const isVideo = type === "video";

  return (
    <Box
      className={`blog-media-tile blog-media-${isImage ? "image" : "video"}`}
      role={isImage ? "button" : undefined}
      tabIndex={isImage ? 0 : undefined}
      onClick={isImage ? () => onOpen({ src, alt }) : undefined}
      onKeyDown={isImage ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen({ src, alt });
        }
      } : undefined}
      aria-label={isImage ? (alt ? `Open image: ${alt}` : "Open blog image") : undefined}
      sx={{
        position: "relative",
        display: "inline-flex",
        verticalAlign: "top",
        width: {
          xs: "calc(50% - 10px)",
          sm: isImage ? "calc(33.333% - 12px)" : "calc(50% - 12px)",
          lg: isImage ? "calc(25% - 14px)" : "calc(50% - 14px)",
        },
        maxWidth: isImage ? { xs: 220, md: 250 } : { xs: "100%", md: 430 },
        minWidth: 0,
        m: { xs: 0.35, sm: 0.55 },
        aspectRatio: isImage ? "1 / 1" : "16 / 9",
        border: "1px solid rgba(205, 180, 255, 0.18)",
        borderRadius: { xs: 1.2, sm: 1.8 },
        overflow: "hidden",
        bgcolor: "rgba(255, 255, 255, 0.04)",
        cursor: isImage ? "zoom-in" : "default",
        boxShadow: "none",
        lineHeight: 0,
        transition: "transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
        "&:hover, &:focus-visible": isImage ? {
          transform: "translateY(-2px)",
          borderColor: "rgba(255, 204, 131, 0.72)",
          boxShadow: "0 16px 42px rgba(0, 0, 0, 0.22)",
          outline: "none",
        } : undefined,
      }}
    >
      {isImage ? (
        <Box
          component="img"
          src={src}
          alt={alt}
          loading="lazy"
          sx={{ display: "block", width: "100%", height: "100%", objectFit: "cover", bgcolor: "background.default" }}
        />
      ) : isVideo ? (
        <Box
          component="video"
          src={src}
          controls
          preload={attribs.preload || "metadata"}
          poster={attribs.poster}
          sx={{ display: "block", width: "100%", height: "100%", objectFit: "cover", bgcolor: "#05040a" }}
        >
          {children}
        </Box>
      ) : (
        <Box
          component="iframe"
          src={src}
          title={attribs.title || "video"}
          frameBorder="0"
          allow={attribs.allow || "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"}
          allowFullScreen
          sx={{ display: "block", width: "100%", height: "100%", border: 0, bgcolor: "#05040a" }}
        />
      )}
    </Box>
  );
}

export default function BlogPostContent({ content }) {
  const theme = useTheme();
  const [activeImage, setActiveImage] = useState(null);

  const options = {
    replace: (domNode) => {
      if (!domNode?.name) return undefined;

      const parentName = domNode.parent?.name;

      if (domNode.name === "p" && isEmptyParagraph(domNode)) {
        return <></>;
      }

      if ((domNode.name === "p" || domNode.name === "div") && isMediaOnlyParagraph(domNode)) {
        return <>{domToReact(domNode.children || [], options)}</>;
      }

      const children = domToReact(domNode.children || [], options);

      switch (domNode.name) {
        case "p": {
          const isEmpty = !children || (Array.isArray(children) && children.length === 0);
          const inList = parentName === "li";
          return (
            <Typography
              variant="body1"
              sx={{ mb: inList ? 0 : isEmpty ? 1 : 2, textAlign: "left", overflowWrap: "anywhere", wordBreak: "break-word" }}
            >
              {isEmpty ? "\u00A0" : children}
            </Typography>
          );
        }

        case "h2":
          return (
            <Typography variant="h2" color="blog.subheading" sx={{ mb: 4, textAlign: "left", overflowWrap: "anywhere", wordBreak: "break-word" }}>
              {children}
            </Typography>
          );

        case "h3":
          return (
            <Typography variant="h3" color="blog.subheading" sx={{ mb: 3, textAlign: "left", overflowWrap: "anywhere", wordBreak: "break-word" }}>
              {children}
            </Typography>
          );

        case "strong":
          return <strong>{children}</strong>;

        case "em":
          return <em>{children}</em>;

        case "u":
          return <u>{children}</u>;

        case "s":
          return <s>{children}</s>;

        case "a":
          if ((domNode.children || []).some(isMediaNode)) return <>{children}</>;
          return (
            <Typography
              component="a"
              href={domNode.attribs.href}
              sx={{
                color: theme.palette.blog.link,
                "&:hover": { color: theme.palette.blog.linkHover },
                cursor: "pointer",
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
              target={domNode.attribs.target || "_blank"}
              rel={domNode.attribs.rel || "noopener noreferrer"}
            >
              {children}
            </Typography>
          );

        case "img":
          return (
            <BlogMediaTile
              type="image"
              src={domNode.attribs.src}
              alt={domNode.attribs.alt || ""}
              attribs={domNode.attribs}
              onOpen={setActiveImage}
            />
          );

        case "iframe":
          return <BlogMediaTile type="iframe" src={domNode.attribs.src} attribs={domNode.attribs} />;

        case "video": {
          const source = domNode.attribs.src || (domNode.children || []).find((child) => child?.name === "source" && child.attribs?.src)?.attribs?.src || "";
          return <BlogMediaTile type="video" src={source} attribs={domNode.attribs}>{children}</BlogMediaTile>;
        }

        case "ul":
          return (
            <Box component="ul" sx={{ pl: 3, mb: 2, textAlign: "left" }}>
              {children}
            </Box>
          );

        case "ol":
          return (
            <Box component="ol" sx={{ pl: 3, mb: 2, textAlign: "left" }}>
              {children}
            </Box>
          );

        case "li":
          return (
            <Box component="li" sx={{ mb: 0, textAlign: "left", overflowWrap: "anywhere", wordBreak: "break-word" }}>
              {children}
            </Box>
          );

        default:
          return undefined;
      }
    },
  };

  return (
    <Box sx={{ minWidth: 0, maxWidth: "100%", textAlign: "center", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      {parse(content, options)}
      <Dialog open={Boolean(activeImage)} onClose={() => setActiveImage(null)} maxWidth="lg" fullWidth>
        {activeImage && (
          <DialogContent sx={{ position: "relative", p: { xs: 1.5, sm: 2 }, bgcolor: "background.paper" }}>
            <IconButton onClick={() => setActiveImage(null)} aria-label="Close image preview" sx={{ position: "absolute", right: 14, top: 14, zIndex: 1, bgcolor: "rgba(10, 8, 18, 0.72)" }}>
              <CloseIcon />
            </IconButton>
            <Box
              component="img"
              src={activeImage.src}
              alt={activeImage.alt || "Blog image"}
              sx={{ display: "block", width: "100%", maxHeight: "82vh", objectFit: "contain", borderRadius: 2, bgcolor: "rgba(0, 0, 0, 0.35)" }}
            />
          </DialogContent>
        )}
      </Dialog>
    </Box>
  );
}
