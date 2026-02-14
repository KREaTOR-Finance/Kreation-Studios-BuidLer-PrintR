import { createContext, useContext } from "react";
import type { GameAPI } from "../state/useGameMachine";

export const GameContext = createContext<GameAPI | null>(null);

export function useGame(): GameAPI {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("GameContext not provided");
  return ctx;
}
