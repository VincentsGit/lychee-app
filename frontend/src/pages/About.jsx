import React from 'react';
import { Container, Typography, Box } from '@mui/material';

export default function About() {
  return (
    <Container sx={{ mt: { xs: 0, md: 4 }, pr: { xs: 2, md: 6 } }}>
      <Typography variant="h2">About</Typography>

      <Typography variant="body1" sx={{ mt: 2 }}>
        Hi — this is the About page. The header and drawer stay the same; only
        this main content area changes when you navigate here.
      </Typography>

      <Typography variant="body1" sx={{ mt: 2 }}>
        A few details about this demo:
      </Typography>

      <Box component="ul" sx={{ pl: 3, mt: 1 }}>
        <li><Typography variant="body1">Built with React + MUI.</Typography></li>
        <li><Typography variant="body1">Client-side routing with React Router.</Typography></li>
        <li><Typography variant="body1">Navigation keeps header & drawer persistent.</Typography></li>
      </Box>
    </Container>
  );
}
