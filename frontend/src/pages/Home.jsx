import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import FavoriteIcon from "@mui/icons-material/Favorite";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import ForumIcon from "@mui/icons-material/Forum";
import { Box, Button, Chip, Grid, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import AnimatedSection from "../components/AnimatedSection";
import flowersGif from "../icons/flowers.gif";
import lavenderGif from "../icons/lavender.gif";
import pandaBounce from "../icons/panda_menu.gif";

export default function Home() {
  return (
    <Stack spacing={{ xs: 6, md: 9 }}>
      <AnimatedSection>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={7}>
            <Stack spacing={3}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label="my blog" color="primary" />
                <Chip label="thoughts, memories, comments" variant="outlined" />
              </Stack>
              <Typography variant="h1" color="blog.subheading">
                Welcome to my website!
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 680 }}>
                This is my little corner of the internet where I can write about whatever I want, keep memories in one place, and share updates without everything disappearing into social media.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Button component={RouterLink} to="/blog" variant="contained" endIcon={<ArrowForwardIcon />}>
                  Read my blog
                </Button>
                <Button component={RouterLink} to="/register" variant="outlined">
                  Leave a comment
                </Button>
              </Stack>
            </Stack>
          </Grid>
          <Grid item xs={12} md={5}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 4 },
                minHeight: 360,
                display: "grid",
                placeItems: "center",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Box component="img" src={pandaBounce} alt="Bouncing panda" sx={{ width: "65%", maxWidth: 260, zIndex: 1 }} />
              <Box component="img" src={lavenderGif} alt="" sx={{ position: "absolute", left: 28, top: 28, width: 72 }} />
              <Box component="img" src={flowersGif} alt="" sx={{ position: "absolute", right: 22, bottom: 18, width: 112 }} />
            </Paper>
          </Grid>
        </Grid>
      </AnimatedSection>

      <Grid container spacing={2.5}>
        {[
          {
            icon: <AutoStoriesIcon />,
            title: "My little diary",
            text: "I can keep all my posts in one place, grouped by year and month so they are easy to look back on later.",
          },
          {
            icon: <ForumIcon />,
            title: "Comments are open",
            text: "Make an account if you want to comment on my posts and have your own cute little profile.",
          },
          {
            icon: <FavoriteIcon />,
            title: "Made by Vincent",
            text: "This website was designed and developed by Vincent, my boyfriend, who also kept my lavender colours and cute lychee vibe.",
          },
        ].map((item, index) => (
          <Grid item xs={12} md={4} key={item.title}>
            <AnimatedSection delay={index * 100}>
              <Paper elevation={0} sx={{ p: 3, height: "100%" }}>
                <Stack spacing={2}>
                  <Box sx={{ color: "secondary.main" }}>{item.icon}</Box>
                  <Typography variant="h4">{item.title}</Typography>
                  <Typography color="text.secondary">{item.text}</Typography>
                </Stack>
              </Paper>
            </AnimatedSection>
          </Grid>
        ))}
      </Grid>

      <AnimatedSection>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 5 } }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h2" color="blog.subheading">Why I wanted this</Typography>
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                I wanted somewhere that felt more mine than a normal social media page. Somewhere cosy for thoughts, photos, videos, plans, comments, and anything else I feel like saving.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button component={RouterLink} to="/about" fullWidth size="large" variant="contained">
                More about me
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </AnimatedSection>
    </Stack>
  );
}
