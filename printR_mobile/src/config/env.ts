import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

export const API_BASE: string =
  extra.apiBase || "https://kreation-studios-buidler-printr.onrender.com";

export const VRF_MODE: "SIM" | "ONCHAIN" =
  extra.vrfMode === "SIM" ? "SIM" : "ONCHAIN";

export const SESSION_FLOW: "SESSION" | "ROUND" =
  extra.sessionFlow === "ROUND" ? "ROUND" : "SESSION";
