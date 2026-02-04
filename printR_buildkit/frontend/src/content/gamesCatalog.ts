export type GameStatus = "LIVE" | "SOON";

export type GameCatalogItem = {
  key: string;
  name: string;
  studio: string;
  status: GameStatus;
  short: string;
  hero: string;
  playPath?: string;
  landingPath?: string;
  comingSoonPath?: string;
};

export const gamesCatalog: GameCatalogItem[] = [
  {
    key: "printr",
    name: "PrintR",
    studio: "BuidLer Labs",
    status: "LIVE",
    short: "TradingView-style score chase. Commit & Close. Closing pressure. Badges + leaderboards.",
    hero: "Fast chart sessions where your score follows the tape.",
    playPath: "/printr",
    landingPath: "/printr/landing",
  },
  {
    key: "project-hive",
    name: "Project Hive",
    studio: "Kreation Studios",
    status: "SOON",
    short: "A future skill-based social game with progression and collectible cosmetics.",
    hero: "Social-first progression loop with premium UX.",
    comingSoonPath: "/games",
  },
  {
    key: "arena-trials",
    name: "Arena Trials",
    studio: "Kreation Studios",
    status: "SOON",
    short: "Competitive quick-match format designed for mobile-first play loops.",
    hero: "Quick matches. Big intensity. Clean controls.",
    comingSoonPath: "/games",
  },
];
