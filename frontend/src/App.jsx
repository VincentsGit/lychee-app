import React, { useState, useEffect } from 'react';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { Container, Typography, Box, Button, CssBaseline, Link as MUILink } from '@mui/material';
import { ThemeProvider, responsiveFontSizes } from '@mui/material/styles';
import { BrowserRouter, Routes, Route, Link as RouterLink } from 'react-router-dom';
import About from './pages/About';
import Socials from './pages/Socials';
import Blog from './pages/Blog';
import Login from './pages/Login';
import Create from './pages/Create';
import BlogPost from "./pages/BlogPost";
import EditPost from "./pages/EditPost";
import { getTheme } from './components/theme';
import Paper from '@mui/material/Paper';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import PandaIcon from './icons/panda.png';
import AppBar from '@mui/material/AppBar';
import Divider from '@mui/material/Divider';
import lavenderGif from './icons/lavender.gif';
import flowersGif from './icons/flowers.gif';
import pandaMenuGif from './icons/panda_menu.gif';

function App() {
  const [mode, setMode] = useState('dark');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(res => {
        if (!res.ok) return;
        return res.json();
      })
      .then(data => {
        if (data && data.user && data.user.id) {
          setIsLoggedIn(true);
          setUserId(data.user.id);
        }
      });
  }, []);

  const toggleMode = () => {
    setMode(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleDrawerToggle = () => {
    setMobileOpen(prev => !prev);
  };

  const drawerWidth = 240;
  const navItems = ['Home', 'About', 'Blog', 'Socials'];
  if (!isLoggedIn) {
    navItems.push('Login');
  }

  const drawer = (
    <div>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <img
          src={pandaMenuGif}
          alt="logo"
          style={{ width: "50%", borderRadius: 8 }}
        />
      </Box>
      <Divider />
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        {navItems.map(item => {
          const to = item === 'Home' ? '/' : `/${item.toLowerCase()}`;

          if (item === 'Login' && !isLoggedIn) {
            return (
              <React.Fragment key={item}>
                <Divider sx={{ mt: 2 }} />
                <Typography sx={{ mt: 2 }}>
                  <MUILink
                    component={RouterLink}
                    to={to}
                    underline="none"
                    color="inherit"
                    sx={{ display: 'block', p: 2, mt: 2 }}
                    onClick={() => { if (mobileOpen) handleDrawerToggle(); }}
                  >
                    {item}
                  </MUILink>
                </Typography>
              </React.Fragment>
            );
          }

          // Render Logout button
          if (item === 'Logout' || isLoggedIn && to === '/login') {
            return (
              <Button
                key="logout"
                onClick={() => {
                  // Clear login state / cookies
                  setIsLoggedIn(false);
                  fetch('/api/logout', {
                    method: 'POST',
                    credentials: 'include',
                  });
                  if (mobileOpen) handleDrawerToggle();
                }}
                sx={{ display: 'block', width: '100%', p: 2, textTransform: 'none' }}
              >
                Logout
              </Button>
            );
          }

          return (
            <Typography key={item}>
              <MUILink
                component={RouterLink}
                to={to}
                underline="none"
                color="inherit"
                sx={{ display: 'block', p: 2 }}
                onClick={() => { if (mobileOpen) handleDrawerToggle(); }}
              >
                {item}
              </MUILink>
            </Typography>
          );
        })}

        {/* If logged in, add Logout manually */}
        {isLoggedIn && (
          <React.Fragment>
            <Divider sx={{ my: 2 }} />
            {userId === 1 && (
              <>
                <Typography>
                  <MUILink
                    component={RouterLink}
                    to={"/create"}
                    underline="none"
                    color="inherit"
                    onClick={() => { if (mobileOpen) handleDrawerToggle(); }}
                    sx={{ display: 'block', p: 2, cursor: 'pointer' }}
                  >
                    Create Post
                  </MUILink>
                </Typography>
              </>
            )}
            <Typography>
              <MUILink
                component={RouterLink}
                to={"/"}
                underline="none"
                color="inherit"
                onClick={() => {
                  setIsLoggedIn(false);
                  fetch('/api/logout', {
                    method: 'POST',
                    credentials: 'include',
                  });
                  if (mobileOpen) handleDrawerToggle();
                }}
                sx={{ display: 'block', p: 2, cursor: 'pointer' }}
              >
                Logout
              </MUILink>
            </Typography>
          </React.Fragment>
        )}
      </Box>

    </div>
  );

  return (
    <ThemeProvider theme={responsiveFontSizes(getTheme(mode))}>
      <CssBaseline />
      <BrowserRouter>
        <Container sx={{ minHeight: '100vh', minWidth: '99vw', p: 1}}>

          <AppBar
            position="fixed"
            sx={{
              width: { md: `calc(100% - ${drawerWidth}px)` },
              ml: { md: `${drawerWidth}px` },
            }}>
            <Paper
              elevation={0}
              square
              sx={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 2,
                zIndex: 1000,
              }}
            >
              <Box>
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="start"
                  onClick={handleDrawerToggle}
                  sx={{ ml: 0, display: { md: 'none' } }}
                >
                  <img
                    src={PandaIcon}
                    alt="menu"
                    style={{
                      width: 30,
                      height: 30,
                    }}
                  />
                </IconButton>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  mt: 1
                }}
              >
                <Box
                  component="img"
                  src={lavenderGif}
                  alt="Lavender"
                  sx={{ width: { xs: "30px", md: "50px" }, mr: { md: 2 } }}
                />

                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: "2rem", md: "3rem" },
                    textAlign: "center",
                  }}
                >
                  lychee
                </Typography>

                <Box
                  component="img"
                  src={flowersGif}
                  alt="Flowers"
                  sx={{ width: { xs: "40px", md: "70px" }, ml: { md: 2 } }}
                />
              </Box>

              <IconButton
                onClick={toggleMode}
                sx={{
                  mr: { xs: 0, md: 6 },
                  scale: { xs: 1, md: 1.2 }
                }}
              >
                {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Paper>
          </AppBar>

          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
              },
            }}
          >
            {drawer}
          </Drawer>

          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                height: '100vh',
              },
            }}
            open
          >
            {drawer}
          </Drawer>

          <Box sx={{ mt: 12, ml: { xs: 0, md: `${drawerWidth}px` }, p: 2 }}>
            <Routes>
              <Route
                path="/"
                element={
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
                    <Box sx={{ mt: 4, textAlign: 'center' }}>
                      <iframe src="https://free.timeanddate.com/clock/ia7vckjt/n31/tles/fn7/fs22/fcf9f/tc000/ftb/bas2/bat1/bacf9f/pa8/tt0/tw1/tm1/td1/th1/ta1/tb4" frameborder="0" width="230" height="80"></iframe>
                    </Box>
                  </Container>
                }
              />

              <Route path="/about" element={<About />} />

              <Route path="/socials" element={<Socials />} />

              <Route path="/blog" element={<Blog />} />

              <Route path="/blog/:postId/:postTitle" element={<BlogPost />} />

              <Route path="/edit/:postId" element={<EditPost />} />

              <Route path="/create" element={<Create />} />

              <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} setUserId={setUserId} />} />
            </Routes>
          </Box>

        </Container>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
