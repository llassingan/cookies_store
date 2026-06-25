// =============================================================================
// Maison Croûte (House of Crust) — Tailwind CSS Design System
// =============================================================================
//
// This config defines the visual identity of the cookie shop. It merges
// two design approaches into one Tailwind setup:
//
//   1. Four custom color palettes (cream, cocoa, rose, sage) that give
//      the shop a warm, European patisserie feel — think buttery tones
//      for backgrounds, rich browns for text, muted reds for accents,
//      and soft greens for call-to-action buttons.
//
//   2. shadcn/ui-compatible CSS variable tokens (background, foreground,
//      primary, secondary, muted, accent, destructive, etc.) wired to
//      HSL custom properties defined in globals.css. These tokens let
//      the admin toggle a dark mode class on the root element without
//      changing any component code.
//
// Custom animations:
//   fade-in        — Cards and sections slide up gently as they appear
//   soft-pulse     — Subtle breathing effect for loading states and
//                     "ready for pickup" indicators
//   accordion-*    — Smooth open/close for Radix UI accordions (used in
//                     order detail panels and the admin menu editor)
//
// The paper-grain background is a tiny radial-gradient pattern that
// adds the faintest texture to card surfaces, mimicking the look of
// artisan bakery paper.
// =============================================================================

import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],          // Toggled via a CSS class on <html>, not OS preference
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1.25rem',
      screens: {
        '2xl': '1280px',        // Caps the max content width at 1280px for readability
      },
    },
    extend: {
      fontFamily: {
        // Serif for headings and hero text (Playfair Display via next/font)
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
        // Sans-serif for body copy, forms, and admin panels
        body: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // ---- Custom brand palettes (European bakery theme) ----
        cream: {
          50: '#FBF6EE',
          100: '#F5EBD7',
          200: '#EAD9B6',
          300: '#DCC391',
          400: '#CBA76A',
          500: '#B98A4D',       // Midpoint — warm, buttery neutral
          600: '#9E7142',
          700: '#7E5937',
          800: '#5E4129',
          900: '#3F2B1B',
        },
        cocoa: {
          50: '#F6F1EB',
          100: '#E6D7C6',
          200: '#C9AC8A',
          300: '#A87F56',
          400: '#84592F',
          500: '#5E3D1E',       // Midpoint — dark chocolate brown
          600: '#4A301A',
          700: '#382413',
          800: '#27190E',
          900: '#180E07',
        },
        rose: {
          50: '#FDF2F0',
          100: '#FAE0DC',
          200: '#F2BDB4',
          300: '#E99589',
          400: '#DE6C5C',
          500: '#C94838',       // Midpoint — muted cherry red for accents
          600: '#A5362A',
          700: '#7E2820',
          800: '#561B16',
          900: '#2F0E0B',
        },
        sage: {
          50: '#F4F7F1',
          100: '#E5ECDB',
          200: '#C7D8B3',
          300: '#A4BD89',
          400: '#7E9D5F',
          500: '#5F7E42',       // Midpoint — earthy green for CTAs and success states
          600: '#49632F',
          700: '#364B24',
          800: '#233219',
          900: '#11190C',
        },

        // ---- shadcn/ui semantic tokens (driven by CSS variables) ----
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'soft-pulse': { '0%, 100%': { opacity: '0.6' }, '50%': { opacity: '1' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'soft-pulse': 'soft-pulse 2s ease-in-out infinite',
      },
      // Subtle paper texture for card backgrounds — two overlapping
      // radial dots at 12px spacing create a fine grain effect.
      backgroundImage: {
        'paper-grain':
          'radial-gradient(rgba(120, 80, 50, 0.04) 1px, transparent 1px), radial-gradient(rgba(120, 80, 50, 0.04) 1px, transparent 1px)',
      },
      backgroundSize: {
        'paper-grain': '12px 12px',
      },
    },
  },
  plugins: [animate],           // tailwindcss-animate — adds the `animate-*` utilities
};

export default config;
