import { useEffect, useMemo, useState } from "react";
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
import About from "./pages/About";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Create from "./pages/Create";
import EditPost from "./pages/EditPost";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Settings from "./pages/Settings";
import Socials from "./pages/Socials";
import SteamSavings from "./pages/SteamSavings";
import Travel from "./pages/Travel";
import User from "./pages/User";
import { api } from "./components/api";
import { decodeDisplayText } from "./components/displayText";
import { getTheme } from "./components/theme";
import UserAvatar from "./components/UserAvatar";
import PandaIcon from "./icons/panda.png";

function AppShell() {
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
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box component="img" src={PandaIcon} alt="lychee" sx={{ width: 42, height: 42 }} />
        <Box>
          <Typography variant="h5" lineHeight={1}>lychee</Typography>
          <Typography variant="caption" color="text.secondary">my little site</Typography>
        </Box>
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
        <AppBar position="sticky" color="transparent" elevation={0} sx={{ backdropFilter: "blur(18px)" }}>
          <Toolbar sx={{ gap: 2, px: { xs: 2, md: 4 } }}>
            <IconButton onClick={() => setMobileOpen(true)} sx={{ display: { md: "none" } }}>
              <MenuIcon />
            </IconButton>
            <MUILink component={RouterLink} to="/" underline="none" color="inherit" sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
              <Box component="img" src={PandaIcon} alt="" sx={{ width: 34, height: 34 }} />
              <Typography variant="h4" sx={{ letterSpacing: 0 }}>lychee</Typography>
            </MUILink>
            <Stack direction="row" spacing={0.5} sx={{ ml: 3, display: { xs: "none", md: "flex" } }}>
              {navItems.map((item) => (
                <Button key={item.to} component={RouterLink} to={item.to}>{item.label}</Button>
              ))}
            </Stack>
            <Box sx={{ flex: 1 }} />
            {user?.username === "runitrench" && (
              <Button component={RouterLink} to="/create" startIcon={<CreateIcon />} sx={{ display: { xs: "none", md: "inline-flex" } }}>
                Create
              </Button>
            )}
            <IconButton onClick={() => setMode((prev) => (prev === "light" ? "dark" : "light"))}>
              {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              {user ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button component={RouterLink} to={`/users/${user.id}`} startIcon={<UserAvatar user={user} size={30} />}>
                    {decodeDisplayText(user.displayName || user.username)}
                  </Button>
                  <Button component={RouterLink} to="/settings" startIcon={<SettingsIcon />}>
                    Settings
                  </Button>
                  <Button onClick={logout} startIcon={<LogoutIcon />}>
                    Logout
                  </Button>
                </Stack>
              ) : (
                <Stack direction="row" spacing={1}>
                  <Button component={RouterLink} to="/login">Login</Button>
                  <Button component={RouterLink} to="/register" variant="contained">Register</Button>
                </Stack>
              )}
            </Box>
          </Toolbar>
        </AppBar>

        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}>
          <Box sx={{ width: 290, height: "100%" }}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
              <IconButton onClick={() => setMobileOpen(false)}><CloseIcon /></IconButton>
            </Box>
            {drawer}
          </Box>
        </Drawer>

        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About user={user} />} />
            <Route path="/socials" element={<Socials />} />
            <Route path="/blog" element={<Blog user={user} />} />
            <Route path="/travel" element={<Travel user={user} />} />
            <Route path="/travel/:planId" element={<Travel user={user} />} />
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
        </Container>
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
