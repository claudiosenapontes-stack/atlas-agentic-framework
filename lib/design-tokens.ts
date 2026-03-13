/** @format */

/**
 * ATLAS Design System — Mars Operations Theme
 * SpaceX-inspired mission control aesthetic
 */

export const colors = {
  // Base (Dark Charcoal / Black)
  background: {
    primary: '#0A0A0B',      // Deep black
    secondary: '#111113',    // Charcoal
    tertiary: '#1A1A1D',     // Elevated surfaces
    quaternary: '#222226',   // Borders/dividers
  },

  // Mars Accent Palette
  mars: {
    rust: '#C45C26',         // Primary accent
    redOrange: '#E85D04',    // Active states
    burntCopper: '#9C6644',  // Secondary accent
    sand: '#F4D03F',         // Highlights
    dust: '#D4A574',         // Subtle accents
  },

  // Functional Colors
  status: {
    operational: '#22C55E',  // Green
    warning: '#E85D04',      // Mars orange
    critical: '#DC2626',     // Red
    unknown: '#6B7280',      // Gray
  },

  // Text Hierarchy
  text: {
    primary: '#FAFAFA',      // White
    secondary: '#A1A1AA',    // Zinc 400
    tertiary: '#71717A',     // Zinc 500
    muted: '#52525B',        // Zinc 600
  },

  // Border/Glow
  border: {
    subtle: '#27272A',       // Zinc 800
    default: '#3F3F46',      // Zinc 700
    glow: 'rgba(196, 92, 38, 0.3)',  // Mars rust glow
  },
};

export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
};

export const typography = {
  fontFamily: {
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  sizes: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    base: '1rem',    // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
  },
};

export const effects = {
  glow: {
    mars: '0 0 20px rgba(196, 92, 38, 0.15)',
    marsStrong: '0 0 30px rgba(196, 92, 38, 0.25)',
    green: '0 0 20px rgba(34, 197, 94, 0.15)',
  },
  border: {
    mars: '1px solid rgba(196, 92, 38, 0.3)',
    subtle: '1px solid #27272A',
  },
};
