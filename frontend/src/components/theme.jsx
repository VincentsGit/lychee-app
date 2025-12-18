import { createTheme } from '@mui/material/styles';

const lightPalette = {
  mode: 'light',
  primary: {
    main: '#8B5CF6',   // soft purple
    light: '#BCA7F9',
    dark: '#6D28D9',
  },
  secondary: {
    main: '#E79E64',   // warm orange accent
    light: '#F3C69C',
    dark: '#C97A3D',
  },
  background: {
    default: '#d1bfffff',
    paper: '#ddd1ffff',
  },
  text: {
    primary: '#2C2738',
    secondary: '#5E5873',
  },
  error: { main: '#E57373' },
  success: { main: '#4FB98E' },
  info: { main: '#A78BFA' },

  // 🆕 Blog-specific additions
  blog: {
    link: '#7B61FF',           // soft vivid purple for links
    linkHover: '#5A3DE3',      // darker hover
    subheading: '#6B4FD8',     // for h2/h3 headings
    quoteBg: '#F1EDFB',        // subtle lavender background for blockquotes
    codeBg: '#EEEAFB',         // light code background
    codeText: '#4B0082',       // readable indigo
  },
};

const darkPalette = {
  mode: 'dark',
  primary: {
    main: '#9B5DE5',
    light: '#C792FF',
    dark: '#7B3FE4',
  },
  secondary: {
    main: '#F4A261',
    light: '#F7C391',
    dark: '#C77D4D',
  },
  background: {
    default: '#1E1B2F',
    paper: '#2A263F',
  },
  text: {
    primary: '#EDECF7',
    secondary: '#BFBBD1',
  },
  error: { main: '#EF626C' },
  success: { main: '#3FC1C9' },
  info: { main: '#D0B3FF' },

  // 🆕 Blog-specific additions
  blog: {
    link: '#B794F4',           // lavender purple for links
    linkHover: '#D6BCFA',      // lighter on hover
    subheading: '#CDB4FF',     // pastel violet for headers
    quoteBg: '#2E2945',        // muted dark lavender background
    codeBg: '#332B4E',         // code block background
    codeText: '#E0D6FF',       // soft violet text
  },
};


// Function to get theme based on mode
export const getTheme = (mode = 'light') => {
  return createTheme({
    palette: mode === 'light' ? lightPalette : darkPalette,
    typography: {
      fontFamily: '"Playfair Display", "Playfair", serif',
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
          },
        },
      },
    },
  });
};
