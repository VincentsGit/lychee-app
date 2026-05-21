import { Container, Typography } from "@mui/material";

export default function LegacyAbout() {
  return (
    <Container sx={{ mt: { xs: 0, md: 4 } }}>
      <Typography variant="h2" color="blog.subheading">About</Typography>
      <Typography variant="body1" sx={{ mt: 4 }}>This is the About page.</Typography>
      <Typography variant="body1" sx={{ mt: 2 }}>
        Not too sure what will go here yet, but probably some information about me.
      </Typography>
    </Container>
  );
}
