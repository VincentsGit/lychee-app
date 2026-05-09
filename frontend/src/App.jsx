import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import CreateIcon from "@mui/icons-material/Create";
import {
  AppBar,
  Box,
  Button,
  Container,
  CssBaseline,
  Drawer,
  IconButton,
  Link as MUILink,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { ThemeProvider, responsiveFontSizes } from "@mui/material/styles";
import { BrowserRouter, Link as RouterLink, Route, Routes, useNavigate } from "react-router-dom";
import { api } from "./components/api";
import { decodeDisplayText } from "./components/displayText";
import { getTheme } from "./components/theme";
import UserAvatar from "./components/UserAvatar";
import PandaIcon from "./icons/panda.png";

const About = lazy(() => import("./pages/About"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Create = lazy(() => import("./pages/Create"));
const EditPost = lazy(() => import("./pages/EditPost"));
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Settings = lazy(() => import("./pages/Settings"));
const Socials = lazy(() => import("./pages/Socials"));
const Spotify = lazy(() => import("./pages/Spotify"));
const SteamSavings = lazy(() => import("./pages/SteamSavings"));
const Travel = lazy(() => import("./pages/Travel"));
const User = lazy(() => import("./pages/User"));
const Watchlist = lazy(() => import("./pages/Watchlist"));

function AppShell() {
  const sidebarWidth = 280;
  const [mode, setMode] = useState("dark");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(undefined);
  const navigate = useNavigate();

  const theme = useMemo(() => responsiveFontSizes(getTheme(mode)), [mode]);

  const refreshUser = () => {
    api("/api/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const logout = async () => {
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    setUser(null);
    setMobileOpen(false);
    navigate("/");
  };

  const navItems = [
    { label: "Home", to: "/" },
    { label: "About", to: "/about" },
    { label: "Blog", to: "/blog" },
    { label: "Travel", to: "/travel" },
    { label: "Watchlist", to: "/watchlist" },
    { label: "Spotify", to: "/spotify" },
    { label: "Games", to: "/games" },
    { label: "Socials", to: "/socials" },
  ];

  const nav = (
    <Stack spacing={1.2}>
      {navItems.map((item) => (
        <Button
          key={item.to}
          component={RouterLink}
          to={item.to}
          onClick={() => setMobileOpen(false)}
          sx={{ justifyContent: "flex-start", px: 2 }}
        >
          {item.label}
        </Button>
      ))}
      {user?.username === "runitrench" && (
        <Button
          component={RouterLink}
          to="/create"
          startIcon={<CreateIcon />}
          onClick={() => setMobileOpen(false)}
          sx={{ justifyContent: "flex-start", px: 2 }}
        >
          Create
        </Button>
      )}
    </Stack>
  );

  const account = user ? (
    <Stack spacing={1.2}>
      <Button
        component={RouterLink}
        to={`/users/${user.id}`}
        onClick={() => setMobileOpen(false)}
        startIcon={<UserAvatar user={user} size={28} />}
        sx={{ justifyContent: "flex-start", px: 2 }}
      >
        {decodeDisplayText(user.displayName || user.username)}
      </Button>
      <Button
        component={RouterLink}
        to="/settings"
        startIcon={<SettingsIcon />}
        onClick={() => setMobileOpen(false)}
        sx={{ justifyContent: "flex-start", px: 2 }}
      >
        Settings
      </Button>
      <Button startIcon={<LogoutIcon />} onClick={logout} sx={{ justifyContent: "flex-start", px: 2 }}>
        Logout
      </Button>
    </Stack>
  ) : (
    <Stack spacing={1.2}>
      <Button component={RouterLink} to="/login" onClick={() => setMobileOpen(false)} sx={{ justifyContent: "flex-start", px: 2 }}>
        Login
      </Button>
      <Button component={RouterLink} to="/register" variant="contained" onClick={() => setMobileOpen(false)} sx={{ justifyContent: "flex-start", px: 2 }}>
        Register
      </Button>
    </Stack>
  );

  const drawer = (
    <Box sx={{ p: 2.5, height: "100%", display: "flex", flexDirection: "column", gap: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
        <MUILink component={RouterLink} to="/" underline="none" color="inherit" onClick={() => setMobileOpen(false)} sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          <Box component="img" src={PandaIcon} alt="lychee" sx={{ width: 42, height: 42, flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" lineHeight={1}>lychee</Typography>
            <Typography variant="caption" color="text.secondary">my little site</Typography>
          </Box>
        </MUILink>
        <IconButton onClick={() => setMode((prev) => (prev === "light" ? "dark" : "light"))} aria-label="Toggle colour mode">
          {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
        </IconButton>
      </Stack>
      {nav}
      <Box sx={{ flex: 1 }} />
      {account}
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh" }}>
        <AppBar position="sticky" color="transparent" elevation={0} sx={{ display: { md: "none" }, backdropFilter: "blur(18px)" }}>
          <Toolbar sx={{ gap: 2, px: { xs: 2, md: 4 } }}>
            <IconButton onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>
            <MUILink component={RouterLink} to="/" underline="none" color="inherit" sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
              <Box component="img" src={PandaIcon} alt="" sx={{ width: 34, height: 34 }} />
              <Typography variant="h4" sx={{ letterSpacing: 0 }}>lychee</Typography>
            </MUILink>
            <Box sx={{ flex: 1 }} />
            <IconButton onClick={() => setMode((prev) => (prev === "light" ? "dark" : "light"))}>
              {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box
          component="aside"
          sx={{
            display: { xs: "none", md: "block" },
            position: "fixed",
            inset: "0 auto 0 0",
            width: sidebarWidth,
            borderRight: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            backdropFilter: "blur(18px)",
            zIndex: (currentTheme) => currentTheme.zIndex.drawer,
            overflowY: "auto",
          }}
        >
          {drawer}
        </Box>

        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}>
          <Box sx={{ width: 290, height: "100%" }}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
              <IconButton onClick={() => setMobileOpen(false)}><CloseIcon /></IconButton>
            </Box>
            {drawer}
          </Box>
        </Drawer>

        <Box component="main" sx={{ minHeight: "100vh", ml: { md: `${sidebarWidth}px` } }}>
          <Container maxWidth="xl" sx={{ py: { xs: 3, md: 6 } }}>
            <Suspense fallback={<Typography color="text.secondary">Loading...</Typography>}>
              <Routes>
                <Route path="/" element={<Home user={user} />} />
                <Route path="/about" element={<About user={user} />} />
                <Route path="/socials" element={<Socials />} />
                <Route path="/blog" element={<Blog user={user} />} />
                <Route path="/travel" element={<Travel user={user} />} />
                <Route path="/travel/:planId" element={<Travel user={user} />} />
                <Route path="/watchlist" element={<Watchlist user={user} />} />
                <Route path="/watchlist/:itemId" element={<Watchlist user={user} />} />
                <Route path="/spotify" element={<Spotify user={user} />} />
                <Route path="/blog/:postId/:postTitle" element={<BlogPost user={user} />} />
                <Route path="/edit/:postId" element={<EditPost />} />
                <Route path="/create" element={<Create />} />
                <Route path="/login" element={<Login setUser={setUser} />} />
                <Route path="/register" element={<Register setUser={setUser} />} />
                <Route path="/settings" element={<Settings user={user} refreshUser={refreshUser} />} />
                <Route path="/games" element={<SteamSavings />} />
                <Route path="/steam-savings" element={<SteamSavings />} />
                <Route path="/users/:userId" element={<User />} />
              </Routes>
            </Suspense>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
