import { createTheme, alpha } from "@mui/material/styles";

const lightPalette = {
  mode: "light",
  primary: {
    main: "#8B5CF6",
    light: "#BCA7F9",
    dark: "#6D28D9",
  },
  secondary: {
    main: "#E79E64",
    light: "#F3C69C",
    dark: "#C97A3D",
  },
  background: {
    default: "#F6F1FF",
    paper: "#FFF9FD",
  },
  text: {
    primary: "#2C2738",
    secondary: "#665F78",
  },
  error: { main: "#E57373" },
  success: { main: "#4FB98E" },
  info: { main: "#A78BFA" },
  blog: {
    link: "#7B61FF",
    linkHover: "#5A3DE3",
    subheading: "#6B4FD8",
    quoteBg: "#F1EDFB",
    codeBg: "#EEEAFB",
    codeText: "#4B0082",
  },
};

const darkPalette = {
  mode: "dark",
  primary: {
    main: "#9B5DE5",
    light: "#C792FF",
    dark: "#7B3FE4",
  },
  secondary: {
    main: "#F4A261",
    light: "#F7C391",
    dark: "#C77D4D",
  },
  background: {
    default: "#171326",
    paper: "#241F35",
  },
  text: {
    primary: "#F4F1FF",
    secondary: "#C8C0DA",
  },
  error: { main: "#EF626C" },
  success: { main: "#3FC1C9" },
  info: { main: "#D0B3FF" },
  blog: {
    link: "#B794F4",
    linkHover: "#D6BCFA",
    subheading: "#CDB4FF",
    quoteBg: "#2E2945",
    codeBg: "#332B4E",
    codeText: "#E0D6FF",
  },
};

export const getTheme = (mode = "light") => {
  const palette = mode === "light" ? lightPalette : darkPalette;

  return createTheme({
    palette,
    typography: {
      fontFamily: '"Playfair Display", Georgia, serif',
      h1: {
        fontSize: "clamp(2.55rem, 6vw, 5.4rem)",
        lineHeight: 0.98,
        fontWeight: 800,
        letterSpacing: 0,
      },
      h2: {
        fontSize: "2rem",
        lineHeight: 1.12,
        fontWeight: 800,
        letterSpacing: 0,
      },
      h3: {
        fontSize: "1.35rem",
        lineHeight: 1.2,
        fontWeight: 800,
        letterSpacing: 0,
      },
      h4: {
        fontSize: "1.05rem",
        lineHeight: 1.2,
        fontWeight: 800,
        letterSpacing: 0,
      },
      h5: {
        fontWeight: 800,
        letterSpacing: 0,
      },
      button: {
        fontWeight: 800,
        letterSpacing: 0,
      },
    },
    shape: {
      borderRadius: 14,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            background:
              mode === "light"
                ? "radial-gradient(circle at 10% 0%, rgba(231,158,100,0.16), transparent 32%), #F6F1FF"
                : "radial-gradient(circle at 10% 0%, rgba(155,93,229,0.18), transparent 34%), #171326",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            border: `1px solid ${alpha(palette.primary.main, mode === "light" ? 0.13 : 0.22)}`,
            boxShadow: mode === "light" ? "0 20px 60px rgba(87, 63, 130, 0.12)" : "0 20px 60px rgba(0, 0, 0, 0.24)",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: 999,
            paddingInline: 18,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          fullWidth: true,
        },
      },
    },
  });
};
