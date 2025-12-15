import React from 'react';
import { Container, Typography, Box, IconButton } from '@mui/material';
import XIcon from '@mui/icons-material/X';
import InstagramIcon from '@mui/icons-material/Instagram';
import YouTubeIcon from '@mui/icons-material/YouTube';

export default function Socials() {
  return (
    <Container sx={{ mt: { xs: 0, md: 4 }}}>
      <Typography variant="h2" color="blog.subheading">Socials</Typography>

      <Typography variant="body1" sx={{ mt: 4 }}>
        Follow me on all my socials!
      </Typography>

      <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
        <IconButton
          component="a"
          href="https://x.com/runitrench"
          target="_blank"
          rel="noopener noreferrer"
          color="primary"
          aria-label="X (Twitter)"
        >
          <XIcon fontSize="large" />
        </IconButton>
        <IconButton
          component="a"
          href="https://www.instagram.com/runitrench"
          target="_blank"
          rel="noopener noreferrer"
          color="primary"
          aria-label="Instagram"
        >
          <InstagramIcon fontSize="large" />
        </IconButton>
        <IconButton
          component="a"
          href="https://www.youtube.com/@runitrench"
          target="_blank"
          rel="noopener noreferrer"
          color="primary"
          aria-label="Youtube"
        >
          <YouTubeIcon fontSize="large" />
        </IconButton>
      </Box>
    </Container>
  );
}
