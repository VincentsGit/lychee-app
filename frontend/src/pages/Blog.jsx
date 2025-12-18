import React from 'react';
import { Container, Typography, Box } from '@mui/material';

export default function Blog() {
  return (
    <Container sx={{ mt: { xs: 0, md: 4 }}}>
      <Typography variant="h2" color="blog.subheading">Blog</Typography>
    </Container>
  );
}
