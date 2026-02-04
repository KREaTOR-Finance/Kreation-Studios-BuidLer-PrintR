// Kreation Studios x BuidLer Labs — Shared Design Tokens
// These are neutral, brand-consistent tokens (Solana/crypto vibe) without hardcoding a single UI lib.
export const tokens = {
  brand: {
    name: "Kreation Studios Games",
    accent: "solana", // conceptual
  },
  colors: {
    bg0: "#0B0D12",
    bg1: "#0F1320",
    panel: "#12172A",
    border: "rgba(255,255,255,0.10)",
    text: "#EAF0FF",
    textDim: "rgba(234,240,255,0.75)",
    good: "#2EE59D",
    bad: "#FF4D6D",
    warn: "#FFB020",
    // Solana-ish accent pair (keep consistent across site + app)
    accentA: "#14F195",
    accentB: "#9945FF",
    link: "#7CC4FF",
  },
  radii: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },
  spacing: {
    xs: 6, sm: 10, md: 14, lg: 18, xl: 28
  },
  type: {
    h1: 30,
    h2: 22,
    h3: 18,
    body: 14,
    mono: 12,
  }
} as const;
