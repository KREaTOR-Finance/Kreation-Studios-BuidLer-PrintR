import type { VrfProvider } from "./provider.js";

export type VrfHealth = {
  mode: "SWITCHBOARD_SESSION" | "DEV";
  degraded: boolean;
  lastError?: { atMs: number; message: string };
};

export function createVrfHealthTracker(initialMode: VrfHealth["mode"]): {
  get: () => VrfHealth;
  setDegraded: (message: string) => void;
  clearDegraded: () => void;
  wrap: (provider: VrfProvider) => VrfProvider;
} {
  let state: VrfHealth = { mode: initialMode, degraded: false };

  return {
    get: () => state,
    setDegraded: (message) => {
      state = {
        ...state,
        degraded: true,
        lastError: { atMs: Date.now(), message }
      };
    },
    clearDegraded: () => {
      state = { ...state, degraded: false };
    },
    wrap: (provider) => provider
  };
}
