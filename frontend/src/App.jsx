import React, { useState } from 'react';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { Container, Typography, Box, Button, CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { getTheme } from './components/theme';
import Paper from '@mui/material/Paper';
import Drawer from '@mui/material/Drawer';
import MenuIcon from '@mui/icons-material/Menu';
import IconButton from '@mui/material/IconButton';
import PandaIcon from '../public/icons/panda.png';
import Toolbar from '@mui/material/Toolbar';
import AppBar from '@mui/material/AppBar';
import Divider from '@mui/material/Divider';

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
          src="../public/icons/panda_menu.gif"
          alt="logo"
          style={{ width: "50%", borderRadius: 8 }}
        />
      </Box>
      <Divider />
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        {navItems.map(item => (
          <Typography key={item} sx={{ p: 2 }}>
            {item}
          </Typography>
        ))}
      </Box>
    </div>
  );

  return (
    <ThemeProvider theme={getTheme(mode)}>
      <CssBaseline />
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
                src="/icons/lavender.gif"
                alt="left"
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
                src="/icons/flowers.gif"
                alt="right"
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

        {/* FIXED: Add margin below fixed header */}
        <Box sx={{ mt: 12, ml: { xs: 0, md: `${drawerWidth}px` }, p: 2 }}>


          <Button variant="contained" onClick={toggleMode}>
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </Button>

          <Typography sx={{ mt: 2 }}>
            This is a sample text in {mode} mode.
          </Typography>
        </Box>

      </Container>
    </ThemeProvider>
  );
}

export default App;
