import { Box, Container, Typography } from "@mui/material";

export default function LegacyHome() {
  return (
    <Container sx={{ mt: { xs: 0, md: 4 } }}>
      <Typography variant="h2" color="blog.subheading">Welcome to my website!</Typography>
      <Typography variant="body1" sx={{ mt: 4 }}>
        This is a website that was built by my lovely boyfriend that I'm using to write my thoughts down.
      </Typography>
      <Typography variant="body1" sx={{ mt: 1 }}>
        If you like the website, please hire my boyfriend as a software engineer! He is very talented and hardworking.
      </Typography>
      <Typography variant="body1" sx={{ mt: 4 }}>
        I hope you enjoy your stay!
      </Typography>
      <Box sx={{ mt: 4, textAlign: "center" }}>
        <iframe
          src="https://free.timeanddate.com/clock/ia7vckjt/n31/tles/fn7/fs22/fcf9f/tc000/ftb/bas2/bat1/bacf9f/pa8/tt0/tw1/tm1/td1/th1/ta1/tb4"
          title="Legacy clock"
          width="230"
          height="80"
          frameBorder="0"
        />
      </Box>
    </Container>
  );
}
