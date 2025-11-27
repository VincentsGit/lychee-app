import React, { useState } from 'react';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { Container, Typography, Box, Button, CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { getTheme } from './components/theme';
import Divider from '@mui/material/Divider';

function App() {
  const [mode, setMode] = useState('dark');

  const toggleMode = () => {
    setMode(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeProvider theme={getTheme(mode)}>
      <CssBaseline />
      <Container sx={{ minHeight: '100vh', minWidth: '100vw', p: 1 }}>
        
        <Box sx={{ pt: 2, display: { xs: 'none', md: 'block' } }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: '4rem',
              textAlign: 'center',
            }}
          >
            welcome to
          </Typography>
          <Typography
            variant="h1"
            sx={{
              fontSize: '4rem',
              textAlign: 'center',
            }}
          >
            runi's trenches
          </Typography>
        </Box>

        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: '2rem',
              textAlign: 'center',
            }}
          >
            runi's trenches
          </Typography>
        </Box>
        
        <Divider sx={{ mt: 2, ml: -3, mr: -3 }}/>

        <Container sx={{ p: 2 }}>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}> 
            <Button variant="contained" color="primary" onClick={toggleMode}>
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </Button>
          </Box>
        </Container>
        <Box>
          <Button variant="contained" color="primary" onClick={toggleMode}>
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
