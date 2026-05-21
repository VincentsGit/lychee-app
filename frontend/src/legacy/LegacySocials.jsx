import InstagramIcon from "@mui/icons-material/Instagram";
import XIcon from "@mui/icons-material/X";
import YouTubeIcon from "@mui/icons-material/YouTube";
import { Box, Container, IconButton, SvgIcon, Typography } from "@mui/material";

function TikTokIcon(props) {
  return (
    <SvgIcon {...props} viewBox="12 4 26 42">
      <path d="M41,4H9C6.243,4,4,6.243,4,9v32c0,2.757,2.243,5,5,5h32c2.757,0,5-2.243,5-5V9C46,6.243,43.757,4,41,4z M37.006,22.323 c-0.227,0.021-0.457,0.035-0.69,0.035c-2.623,0-4.928-1.349-6.269-3.388c0,5.349,0,11.435,0,11.537c0,4.709-3.818,8.527-8.527,8.527 s-8.527-3.818-8.527-8.527s3.818-8.527,8.527-8.527c0.178,0,0.352,0.016,0.527,0.027v4.202c-0.175-0.021-0.347-0.053-0.527-0.053 c-2.404,0-4.352,1.948-4.352,4.352s1.948,4.352,4.352,4.352s4.527-1.894,4.527-4.298c0-0.095,0.042-19.594,0.042-19.594h4.016 c0.378,3.591,3.277,6.425,6.901,6.685V22.323z" />
    </SvgIcon>
  );
}

function TwitchIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 16 16">
      <path d="M3.857 0 1 2.857v10.286h3.429V16l2.857-2.857H9.57L14.714 8V0zm9.714 7.429-2.285 2.285H9l-2 2v-2H4.429V1.143h9.142z" />
      <path d="M11.857 3.143h-1.143V6.57h1.143zm-3.143 0H7.571V6.57h1.143z" />
    </SvgIcon>
  );
}

export default function LegacySocials() {
  const iconSx = { fontSize: { xs: 20, md: 40 } };
  return (
    <Container sx={{ mt: { xs: 0, md: 4 } }}>
      <Typography variant="h2" color="blog.subheading">Socials</Typography>
      <Typography variant="body1" sx={{ mt: 4 }}>Follow me on all my socials!</Typography>
      <Box sx={{ mt: 4, display: "flex", gap: 2 }}>
        <IconButton component="a" href="https://x.com/runitrench" target="_blank" rel="noopener noreferrer" color="primary" aria-label="X (Twitter)"><XIcon sx={iconSx} /></IconButton>
        <IconButton component="a" href="https://www.instagram.com/runitrench" target="_blank" rel="noopener noreferrer" color="primary" aria-label="Instagram"><InstagramIcon sx={iconSx} /></IconButton>
        <IconButton component="a" href="https://www.tiktok.com/@runitrench" target="_blank" rel="noopener noreferrer" color="primary" aria-label="TikTok"><TikTokIcon sx={iconSx} /></IconButton>
        <IconButton component="a" href="https://www.twitch.tv/runitrench" target="_blank" rel="noopener noreferrer" color="primary" aria-label="Twitch"><TwitchIcon sx={iconSx} /></IconButton>
        <IconButton component="a" href="https://www.youtube.com/@runitrench" target="_blank" rel="noopener noreferrer" color="primary" aria-label="Youtube"><YouTubeIcon sx={iconSx} /></IconButton>
      </Box>
    </Container>
  );
}
