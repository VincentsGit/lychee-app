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

function SystemClock() {
  const formatTime = () =>
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

  const [time, setTime] = useState(formatTime);

  useEffect(() => {
    const tick = () => setTime(formatTime());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Box
      component="time"
      dateTime={time}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        width: "fit-content",
        mt: 0.7,
        px: 1,
        py: 0.35,
        borderRadius: 999,
        border: "1px solid",
        borderColor: "rgba(255, 204, 131, 0.36)",
        color: "secondary.main",
        bgcolor: "rgba(255, 204, 131, 0.08)",
        fontFamily: (currentTheme) => currentTheme.typography.monoFontFamily,
        fontSize: { xs: "0.72rem", md: "0.74rem", lg: "0.78rem" },
        fontWeight: 800,
        letterSpacing: "0.08em",
        lineHeight: 1,
        textShadow: "0 0 16px rgba(255, 204, 131, 0.42)",
      }}
    >
      {time}
    </Box>
  );
}

const About = lazy(() => import("./pages/About"));
const Avalon = lazy(() => import("./pages/Avalon"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Concerts = lazy(() => import("./pages/Concerts"));
const Create = lazy(() => import("./pages/Create"));
const EditPost = lazy(() => import("./pages/EditPost"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Settings = lazy(() => import("./pages/Settings"));
const Socials = lazy(() => import("./pages/Socials"));
const Spotify = lazy(() => import("./pages/Spotify"));
const SteamSavings = lazy(() => import("./pages/SteamSavings"));
const Travel = lazy(() => import("./pages/Travel"));
const User = lazy(() => import("./pages/User"));
const UserSearch = lazy(() => import("./pages/UserSearch"));
const Watchlist = lazy(() => import("./pages/Watchlist"));
const LegacyAppShell = lazy(() => import("./legacy/LegacyAppShell"));

function AppShell() {
  const sidebarWidth = 256;
  const [mode, setMode] = useState("dark");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(undefined);
  const [siteMode, setSiteMode] = useState(() => localStorage.getItem("lycheeSiteMode") || "current");
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

  const switchSiteMode = (nextMode) => {
    localStorage.setItem("lycheeSiteMode", nextMode);
    setSiteMode(nextMode);
    setMobileOpen(false);
    navigate("/");
  };

  const navItems = [
    { label: "Home", to: "/" },
    { label: "About", to: "/about" },
    { label: "Blog", to: "/blog" },
    { label: "Concerts", to: "/concerts" },
    { label: "Travel", to: "/travel" },
    { label: "Gallery", to: "/gallery" },
    { label: "Watchlist", to: "/watchlist" },
    { label: "Avalon", to: "/avalon" },
    { label: "Spotify", to: "/spotify" },
    { label: "Games", to: "/games" },
    { label: "Socials", to: "/socials" },
    { label: "Users", to: "/users" },
  ];

  const sidebarButtonSx = {
    justifyContent: "flex-start",
    width: "100%",
    px: { xs: 1.6, md: 1.45, lg: 1.55 },
    py: { xs: 0.72, md: 0.68, lg: 0.72 },
    minHeight: { xs: 36, md: 36, lg: 38 },
    fontSize: { xs: "0.84rem", md: "0.87rem", lg: "0.92rem" },
    letterSpacing: "0.015em",
    lineHeight: 1.12,
  };

  const nav = (
    <Stack spacing={{ xs: 0.55, md: 0.45 }}>
      {navItems.map((item) => (
        <Button
          key={item.to}
          component={RouterLink}
          to={item.to}
          onClick={() => setMobileOpen(false)}
          sx={sidebarButtonSx}
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
          sx={sidebarButtonSx}
        >
          Create
        </Button>
      )}
      <Button variant="outlined" onClick={() => switchSiteMode("legacy")} sx={{ ...sidebarButtonSx, mt: 0.8 }}>
        Switch to legacy
      </Button>
    </Stack>
  );

  const account = user ? (
    <Stack spacing={{ xs: 0.55, md: 0.45 }}>
      <Button
        component={RouterLink}
        to={`/users/${user.id}`}
        onClick={() => setMobileOpen(false)}
        startIcon={<UserAvatar user={user} size={28} />}
        sx={sidebarButtonSx}
      >
        {decodeDisplayText(user.displayName || user.username)}
      </Button>
      <Button
        component={RouterLink}
        to="/settings"
        startIcon={<SettingsIcon />}
        onClick={() => setMobileOpen(false)}
        sx={sidebarButtonSx}
      >
        Settings
      </Button>
      <Button startIcon={<LogoutIcon />} onClick={logout} sx={sidebarButtonSx}>
        Logout
      </Button>
    </Stack>
  ) : (
    <Stack spacing={{ xs: 0.55, md: 0.45 }}>
      <Button component={RouterLink} to="/login" onClick={() => setMobileOpen(false)} sx={sidebarButtonSx}>
        Login
      </Button>
      <Button component={RouterLink} to="/register" variant="contained" onClick={() => setMobileOpen(false)} sx={sidebarButtonSx}>
        Register
      </Button>
    </Stack>
  );

  const drawer = (
    <Box sx={{ p: { xs: 2.2, md: 1.55, lg: 1.75 }, height: "100%", display: "flex", flexDirection: "column", gap: { xs: 2, md: 1.35, lg: 1.55 } }}>
      <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
        <MUILink component={RouterLink} to="/" underline="none" color="inherit" onClick={() => setMobileOpen(false)} sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          <Box component="img" src={PandaIcon} alt="lychee" sx={{ width: 42, height: 42, flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" lineHeight={1}>lychee</Typography>
            <Typography variant="caption" color="text.secondary">my little site</Typography>
            <SystemClock />
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
      {siteMode === "legacy" ? (
        <Suspense fallback={<Typography color="text.secondary">Loading...</Typography>}>
          <LegacyAppShell
            mode={mode}
            setMode={setMode}
            user={user}
            setUser={setUser}
            logout={logout}
            onSwitchToCurrent={() => switchSiteMode("current")}
          />
        </Suspense>
      ) : (
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
            overflowY: "hidden",
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
                <Route path="/socials" element={<Socials user={user} />} />
                <Route path="/blog" element={<Blog user={user} />} />
                <Route path="/concerts" element={<Concerts user={user} />} />
                <Route path="/travel" element={<Travel user={user} />} />
                <Route path="/travel/:planId" element={<Travel user={user} />} />
                <Route path="/gallery" element={<Gallery user={user} />} />
                <Route path="/watchlist" element={<Watchlist user={user} />} />
                <Route path="/watchlist/:itemId" element={<Watchlist user={user} />} />
                <Route path="/avalon" element={<Avalon />} />
                <Route path="/spotify" element={<Spotify user={user} />} />
                <Route path="/blog/:postId/:postTitle" element={<BlogPost user={user} />} />
                <Route path="/edit/:postId" element={<EditPost />} />
                <Route path="/create" element={<Create />} />
                <Route path="/login" element={<Login setUser={setUser} />} />
                <Route path="/register" element={<Register setUser={setUser} />} />
                <Route path="/settings" element={<Settings user={user} refreshUser={refreshUser} />} />
                <Route path="/games" element={<SteamSavings />} />
                <Route path="/steam-savings" element={<SteamSavings />} />
                <Route path="/users" element={<UserSearch />} />
                <Route path="/users/:userId" element={<User />} />
              </Routes>
            </Suspense>
          </Container>
        </Box>
      </Box>
      )}
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
