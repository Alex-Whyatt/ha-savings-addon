import { createTheme } from '@mui/material';

// Shared design tokens. Light and dark follow the device's colour scheme,
// which is what the HA companion app and browsers report inside the ingress iframe.
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'media' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#0B7A63', contrastText: '#FFFFFF' },
        secondary: { main: '#7357D6' },
        success: { main: '#0B7A63' },
        warning: { main: '#B8620E' },
        error: { main: '#B42318' },
        background: { default: '#F5F6F8', paper: '#FFFFFF' },
        text: { primary: '#111827', secondary: '#556070' },
        divider: '#E3E6EB',
        action: { hover: 'rgba(17, 24, 39, 0.05)' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#3DD6AE', contrastText: '#06261E' },
        secondary: { main: '#A390F0' },
        success: { main: '#3DD6AE' },
        warning: { main: '#F0A24E' },
        error: { main: '#F97066' },
        background: { default: '#0F1115', paper: '#181B21' },
        text: { primary: '#F1F3F6', secondary: '#9BA4B4' },
        divider: '#2A2F38',
        action: { hover: 'rgba(241, 243, 246, 0.07)' },
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: "'Figtree Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontVariantNumeric: 'tabular-nums' },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 16,
          border: `1px solid ${theme.vars.palette.divider}`,
        }),
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: { padding: 20, '&:last-child': { paddingBottom: 20 } },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 10, minHeight: 40 } },
    },
    MuiFab: {
      styleOverrides: { root: { borderRadius: 18, boxShadow: '0 6px 16px rgba(0,0,0,0.25)' } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 16 } },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: ({ theme }) => ({
          height: 6,
          borderRadius: 3,
          backgroundColor: theme.vars.palette.action.hover,
        }),
        bar: { borderRadius: 3 },
      },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { fontSize: '0.8rem' } },
    },
  },
});

// Colours offered for accounts and chart series; they differ in lightness as
// well as hue so they stay distinguishable in both colour schemes.
export const seriesColors = ['#0B7A63', '#2F6FE4', '#B8620E', '#7357D6', '#C2417A', '#0E7490', '#4D7C0F', '#B42318'];

// CSS variable references for places that take a raw colour string (charts,
// inline SVG), so they follow the active colour scheme.
export const cssVars = {
  primary: 'var(--mui-palette-primary-main)',
  textPrimary: 'var(--mui-palette-text-primary)',
  textSecondary: 'var(--mui-palette-text-secondary)',
  divider: 'var(--mui-palette-divider)',
  paper: 'var(--mui-palette-background-paper)',
  hover: 'var(--mui-palette-action-hover)',
};
