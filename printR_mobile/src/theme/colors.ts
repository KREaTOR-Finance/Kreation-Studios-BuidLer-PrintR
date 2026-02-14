export const colors = {
  bgMidnight: "#0B1020",
  bgDeep: "#070A14",
  primaryBlue: "#3B82F6",
  primaryPurple: "#8B5CF6",
  accentTeal: "#22D3EE",
  stateWin: "#22C55E",
  stateLoss: "#EF4444",
  stateWarn: "#F59E0B",
  textPrimary: "#F1F5F9",
  textSecondary: "#F8FAFC",
  textMuted: "rgba(241,245,249,0.8)",
  textDim: "rgba(226,232,240,0.75)",
  surfaceCard: "rgba(255,255,255,0.06)",
  surfaceCardEnd: "rgba(255,255,255,0.03)",
  surfaceInput: "rgba(255,255,255,0.04)",
  borderDefault: "rgba(255,255,255,0.10)",
  borderSubtle: "rgba(255,255,255,0.08)",
  borderActive: "rgba(255,255,255,0.12)",
} as const;

export const glows = {
  blue: "rgba(59,130,246,0.45)",
  purple: "rgba(139,92,246,0.45)",
  win: "rgba(34,197,94,0.55)",
  loss: "rgba(239,68,68,0.45)",
  teal: "rgba(34,211,238,0.22)",
} as const;

export const gradients = {
  primaryBtn: ["rgba(59,130,246,0.92)", "rgba(139,92,246,0.92)"] as [string, string],
  card: ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.03)"] as [string, string],
  activeTab: ["rgba(59,130,246,0.25)", "rgba(139,92,246,0.20)"] as [string, string],
  bgScreen: ["#0B1020", "#070A14"] as [string, string],
} as const;
