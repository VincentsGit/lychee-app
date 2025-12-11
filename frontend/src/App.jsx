import React, { useState } from 'react';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { Container, Typography, Box, Button, CssBaseline, Link as MUILink } from '@mui/material';
import { ThemeProvider,  responsiveFontSizes } from '@mui/material/styles';
import { BrowserRouter, Routes, Route, Link as RouterLink } from 'react-router-dom';
import About from './pages/About';
import { getTheme } from './components/theme';
import Paper from '@mui/material/Paper';
import Drawer from '@mui/material/Drawer';
import MenuIcon from '@mui/icons-material/Menu';
import IconButton from '@mui/material/IconButton';
import PandaIcon from './icons/panda.png';
import Toolbar from '@mui/material/Toolbar';
import AppBar from '@mui/material/AppBar';
import Divider from '@mui/material/Divider';
import lavenderGif from './icons/lavender.gif';
import flowersGif from './icons/flowers.gif';
import pandaMenuGif from './icons/panda_menu.gif';
import selfie from './images/selfie.jpeg';

function App() {
  const [mode, setMode] = useState('dark');
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMode = () => {
    setMode(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleDrawerToggle = () => {
    setMobileOpen(prev => !prev);
  };

  const drawerWidth = 240;
  const navItems = ['Home', 'About', 'Contact'];

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
          return (
            <Typography key={item} sx={{ p: 0 }}>
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
      </Box>
    </div>
  );

  return (
    <ThemeProvider theme={responsiveFontSizes(getTheme(mode))}>
      <CssBaseline />
      <BrowserRouter>
      <Container sx={{ minHeight: '100vh', minWidth: '100vw', p: 1 }}>

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
                gap: 2,              // space between items
                mt: 1
              }}
            >
              {/* Left GIF */}
              <Box
                component="img"
                src={lavenderGif}
                alt="Lavender"
                sx={{ width: {xs: "30px", md: "50px"}, mr: { md: 2} }}
              />

              {/* Centered Title */}
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: "2rem", md: "3rem" },
                  textAlign: "center",
                }}
              >
                lychee
              </Typography>

              {/* Right GIF */}
              <Box
                component="img"
                src={flowersGif}
                alt="Flowers"
                sx={{ width: {xs: "40px", md: "70px"}, ml: { md: 2} }}
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
                <Container sx={{ mt: { xs: 0, md: 4 }, pr: { xs: 2, md: 6 } }}>
                  <Typography variant="h2">Welcome to my website!</Typography>
                  <Typography variant="body1" sx={{ mt: 4 }}>
                    This is a website that was built by my lovely boyfriend that I'm using to write my thoughts down.
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 1 }}>
                    If you like the website, please hire my boyfriend as a software engineer! He is very talented and hardworking.
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 4 }}>
                    Here's a cute selfie of us:
                  </Typography>
                  <Box
                    component="img"
                    src={selfie}
                    alt="Selfie"
                    sx={{ display: 'block', mx: 'auto', width: { xs: '75vw', md: '30vw' }, borderRadius: 4, mt: 4 }}
                  />
                </Container>
              }
            />

            <Route path="/about" element={<About />} />

            <Route
              path="/contact"
              element={
                <Container sx={{ mt: { xs: 0, md: 4 }, pr: { xs: 2, md: 6 } }}>
                  <Typography variant="h2">Contact</Typography>
                  <Typography variant="body1" sx={{ mt: 2 }}>
                    Contact page coming soon.
                  </Typography>
                </Container>
              }
            />
          </Routes>
        </Box>

      </Container>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
