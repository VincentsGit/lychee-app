import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import { lazy, Suspense, useState } from "react";
import { AppBar, Box, Button, Container, Drawer, IconButton, Link as MUILink, Paper, Stack, Toolbar, Typography } from "@mui/material";
import { Link as RouterLink, Navigate, Route, Routes } from "react-router-dom";
import lavenderGif from "../icons/lavender.gif";
import flowersGif from "../icons/flowers.gif";
import pandaMenuGif from "../icons/panda_menu.gif";
import LegacyHome from "./LegacyHome";
import LegacyAbout from "./LegacyAbout";
import LegacySocials from "./LegacySocials";
import LegacyBlog from "./LegacyBlog";
import LegacyBlogPost from "./LegacyBlogPost";
import LegacyLogin from "./LegacyLogin";

const Create = lazy(() => import("../pages/Create"));
const EditPost = lazy(() => import("../pages/EditPost"));

export default function LegacyAppShell({ mode, setMode, user, setUser, logout, onSwitchToCurrent }) {
  const drawerWidth = 240;
  const [mobileOpen, setMobileOpen] = useState(false);
  const isRuni = user?.username === "runitrench";
  const userStillLoading = user === undefined;
  const navItems = [
    { label: "Home", to: "/" },
    { label: "About", to: "/about" },
    { label: "Blog", to: "/blog" },
    { label: "Socials", to: "/socials" },
  ];

  const closeMobile = () => setMobileOpen(false);

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
        <Box component="img" src={pandaMenuGif} alt="logo" sx={{ width: "50%", borderRadius: 1 }} />
      </Box>
      <Box sx={{ textAlign: "center", mt: 2 }}>
        {navItems.map((item) => (
          <Typography key={item.to}>
            <MUILink component={RouterLink} to={item.to} underline="none" color="inherit" onClick={closeMobile} sx={{ display: "block", p: 2 }}>
              {item.label}
            </MUILink>
          </Typography>
        ))}
        {!user && (
          <>
            <Box sx={{ borderTop: "1px solid", borderColor: "divider", mt: 2 }} />
            <Typography sx={{ mt: 2 }}>
              <MUILink component={RouterLink} to="/login" underline="none" color="inherit" onClick={closeMobile} sx={{ display: "block", p: 2 }}>Login</MUILink>
            </Typography>
          </>
        )}
        {user && (
          <>
            <Box sx={{ borderTop: "1px solid", borderColor: "divider", my: 2 }} />
            {isRuni && (
              <Typography>
                <MUILink component={RouterLink} to="/create" underline="none" color="inherit" onClick={closeMobile} sx={{ display: "block", p: 2 }}>
                  Create Post
                </MUILink>
              </Typography>
            )}
            <Typography>
              <MUILink
                component={RouterLink}
                to="/"
                underline="none"
                color="inherit"
                onClick={() => { logout(); closeMobile(); }}
                sx={{ display: "block", p: 2, cursor: "pointer" }}
              >
                Logout
              </MUILink>
            </Typography>
          </>
        )}
      </Box>
      <Box sx={{ flex: 1 }} />
      <Box sx={{ p: 2 }}>
        <Button variant="contained" fullWidth onClick={onSwitchToCurrent}>Switch to current</Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <AppBar position="fixed" sx={{ width: { md: `calc(100% - ${drawerWidth}px)` }, ml: { md: `${drawerWidth}px` } }}>
        <Paper elevation={0} square sx={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", p: 2, zIndex: 1000 }}>
          <Box>
            <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={() => setMobileOpen(true)} sx={{ ml: 0, display: { md: "none" } }}>
              <MenuIcon />
            </IconButton>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ mt: 1 }}>
            <Box component="img" src={lavenderGif} alt="Lavender" sx={{ width: { xs: 30, md: 50 }, mr: { md: 2 } }} />
            <Typography variant="h1" sx={{ fontSize: { xs: "2rem", md: "3rem" }, textAlign: "center" }}>lychee</Typography>
            <Box component="img" src={flowersGif} alt="Flowers" sx={{ width: { xs: 40, md: 70 }, ml: { md: 2 } }} />
          </Stack>
          <IconButton onClick={() => setMode((prev) => (prev === "light" ? "dark" : "light"))} sx={{ mr: { xs: 0, md: 6 }, scale: { xs: 1, md: 1.2 } }}>
            {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Paper>
      </AppBar>

      <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth } }}>
        <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
          <IconButton onClick={() => setMobileOpen(false)}><CloseIcon /></IconButton>
        </Box>
        {drawer}
      </Drawer>

      <Drawer variant="permanent" sx={{ display: { xs: "none", md: "block" }, "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth, height: "100vh" } }} open>
        {drawer}
      </Drawer>

      <Container sx={{ minHeight: "100vh", minWidth: "99vw", p: 1 }}>
        <Box sx={{ mt: 12, ml: { xs: 0, md: `${drawerWidth}px` }, p: 2 }}>
          <Suspense fallback={<Typography color="text.secondary">Loading...</Typography>}>
            <Routes>
              <Route path="/" element={<LegacyHome />} />
              <Route path="/about" element={<LegacyAbout />} />
              <Route path="/socials" element={<LegacySocials />} />
              <Route path="/blog" element={<LegacyBlog user={user} />} />
              <Route path="/blog/:postId/:postTitle" element={<LegacyBlogPost user={user} />} />
              <Route path="/login" element={<LegacyLogin setUser={setUser} />} />
              <Route path="/create" element={isRuni || userStillLoading ? <Create /> : <Navigate to="/" replace />} />
              <Route path="/edit/:postId" element={isRuni || userStillLoading ? <EditPost /> : <Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Box>
      </Container>
    </Box>
  );
}
