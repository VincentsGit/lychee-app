import React from "react";
import parse, { domToReact } from "html-react-parser";
import { Typography, Box, useTheme } from "@mui/material";

export default function BlogPostContent({ content }) {
  const theme = useTheme();

  const options = {
    replace: (domNode) => {
      if (!domNode?.name) return;

      const children = domToReact(domNode.children || [], options);

      const parentName = domNode.parent?.name;

      switch (domNode.name) {
        case "p": {
          const isEmpty = !children || (Array.isArray(children) && children.length === 0);
          // Avoid extra spacing for paragraphs inside lists
          const inList = parentName === "li";
          return (
            <Typography
              variant="body1"
              sx={{ mb: inList ? 0 : isEmpty ? 1 : 2 }}
            >
              {isEmpty ? "\u00A0" : children}
            </Typography>
          );
        }

        case "h2":
          return (
            <Typography variant="h2" color="blog.subheading" sx={{ mb: 4 }}>
              {children}
            </Typography>
          );

        case "h3":
          return (
            <Typography variant="h3" color="blog.subheading" sx={{ mb: 3 }}>
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
          return (
            <Typography
              component="a"
              href={domNode.attribs.href}
              sx={{
                color: theme.palette.blog.link,
                "&:hover": { color: theme.palette.blog.linkHover },
                cursor: "pointer",
              }}
              target={domNode.attribs.target || "_blank"}
              rel={domNode.attribs.rel || "noopener noreferrer"}
            >
              {children}
            </Typography>
          );

        case "img":
          return (
            <Box
              component="img"
              src={domNode.attribs.src}
              alt={domNode.attribs.alt || ""}
              sx={{
                display: "block",
                marginLeft: "auto",
                marginRight: "auto",
                maxWidth: "75%",
                height: "auto",
                mb: 2,
              }}
            />
          );

        case "iframe":
          return (
            <Box
              component="iframe"
              src={domNode.attribs.src}
              sx={{
                display: "block",
                marginLeft: "auto",
                marginRight: "auto",
                width: "100%",
                maxWidth: "800px",
                aspectRatio: "16 / 9",
                height: "auto",
                mb: 2,
              }}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="video"
            />
          );

        case "ul":
          return (
            <Box component="ul" sx={{ pl: 3, mb: 2 }}>
              {children}
            </Box>
          );

        case "ol":
          return (
            <Box component="ol" sx={{ pl: 3, mb: 2 }}>
              {children}
            </Box>
          );

        case "li":
          return (
            <Box component="li" sx={{ mb: 0 }}>
              {children}
            </Box>
          );

        default:
          return undefined;
      }
    },
  };

  return <>{parse(content, options)}</>;
}
