import { useEffect, useReducer, useRef } from "react";
import { buildResultFromServer, durationForTier, initialState, reducer } from "./machine";
import type { View } from "./machine";
import { useSounds } from "./SoundProvider";
import { useHaptics } from "./HapticsProvider";
import { SimVrfAdapter } from "./vrf";
import { createSwitchboardSrsProgramEnforcedAdapter } from "./solanaOnChainVrfAdapter";
import { API_BASE, apiGet, type PlayerHeaders } from "../network/httpClient";
import { getPlayerHeaders } from "./player";
import { logError } from "../utils/errorLogger";

// VRF mode: use environment variable, fallback to ONCHAIN
const useSim = import.meta.env.VITE_VRF_MODE === "SIM";
// Session flow mode: use environment variable, default to session-based
const useSessionFlow = import.meta.env.VITE_SESSION_FLOW !== "ROUND";
const vrf = useSim
  ? SimVrfAdapter
  : createSwitchboardSrsProgramEnforcedAdapter({
      connection: null,
      wallet: null,
      programId: "Pr1ntr1111111111111111111111111111111111111"
    });

type BackendSession = {
  id: string;
  phase: string;
};

type JoinPhase = "LIVE" | "FINAL_COMMIT_WARNING" | "CLOSING";

type JoinOutcome =
  | { ok: true; mode: "play" | "spectate"; phase: JoinPhase; sessionId: string }
  | { ok: false; reason: "BUSY" | "NO_SESSIONS" | "INSUFFICIENT" | "NOT_JOINABLE" | "UNAUTHORIZED" | "RATE_LIMITED" | "JOIN_FAILED"; status?: number; error?: string };

export function useGameMachine(){
  const [state, dispatch] = useReducer(reducer, initialState);
  const inFlightRef = useRef(false);
  const { play } = useSounds();
  const haptics = useHaptics();

  useEffect(() => {
    const player = getPlayerHeaders();
    apiGet<{ ok: boolean; points: number; streak: number }>("/api/profile", player)
      .then((profile) => {
        if (profile && typeof profile.points === "number" && typeof profile.streak === "number") {
          dispatch({ type: "PROFILE_SYNCED", points: profile.points, streak: profile.streak });
        }
      })
      .catch((err) => logError("useGameMachine/profileSync", err));
  }, []);

  const navigate = (view: View) => {
    play("tap");
    haptics.selection();
    dispatch({ type: "NAVIGATE", view });
  };

  const playRound = async (sessionId?: string): Promise<JoinOutcome> => {
    if(inFlightRef.current) return { ok: false, reason: "BUSY" };

    inFlightRef.current = true;
    let join: JoinOutcome | null = null;
    let playToken = "";
    let joinSessionId: string | null = sessionId ?? null;
    try {
      const player = getPlayerHeaders();
      if (!joinSessionId) {
        const sessions = await apiGet<BackendSession[]>("/sessions", player);
        const session = (sessions.find(s => s.phase !== "ENDED") ?? sessions[0]) ?? null;
        if (!session) {
          inFlightRef.current = false;
          return { ok: false, reason: "NO_SESSIONS" };
        }
        joinSessionId = session.id;
      }
      if (!joinSessionId) {
        inFlightRef.current = false;
        return { ok: false, reason: "NO_SESSIONS" };
      }
      const joinTargetId = joinSessionId;

      const idemKey = cryptoRandomId();
      const joinRes = await fetch(`${API_BASE}/api/sessions/${joinTargetId}/join`, {
        method: "POST",
        headers: buildHeaders(player, { "Idempotency-Key": idemKey }),
        body: JSON.stringify({ mode: "play" })
      });
      const joinJson = await readJson(joinRes);
      const joinError = typeof joinJson?.error === "string" ? joinJson.error : undefined;
      if (!joinRes.ok) {
        inFlightRef.current = false;
        if (joinRes.status === 402) return { ok: false, reason: "INSUFFICIENT", status: joinRes.status, error: joinError };
        if (joinRes.status === 409) return { ok: false, reason: "NOT_JOINABLE", status: joinRes.status, error: joinError };
        if (joinRes.status === 401) return { ok: false, reason: "UNAUTHORIZED", status: joinRes.status, error: joinError };
        if (joinRes.status === 429) return { ok: false, reason: "RATE_LIMITED", status: joinRes.status, error: joinError };
        if (joinRes.status === 404) return { ok: false, reason: "NO_SESSIONS", status: joinRes.status, error: joinError };
        return { ok: false, reason: "JOIN_FAILED", status: joinRes.status, error: joinError };
      }

      const mode = joinJson?.join === "spectate" ? "spectate" : "play";
      const phase = (joinJson?.phase ?? (mode === "spectate" ? "CLOSING" : "LIVE")) as JoinPhase;
      const sessionId = String(joinJson?.sessionId ?? joinTargetId);
      playToken = typeof joinJson?.playToken === "string" ? joinJson.playToken : "";

      join = { ok: true, mode, phase, sessionId };
      dispatch({ type: "JOIN_UPDATED", join: { mode, phase, sessionId } });

      if (mode === "spectate") {
        dispatch({ type: "NAVIGATE", view: "live" });
        inFlightRef.current = false;
        return { ok: true, mode, phase, sessionId };
      }

      if (!playToken && !useSessionFlow) {
        inFlightRef.current = false;
        return { ok: false, reason: "JOIN_FAILED", status: joinRes.status, error: "MISSING_PLAY_TOKEN" };
      }
    } catch {
      inFlightRef.current = false;
      return { ok: false, reason: "JOIN_FAILED", error: "NETWORK_ERROR" };
    }

    dispatch({ type: "PLAY_REQUESTED" });

    const now = Date.now();
    const durationMs = useSessionFlow ? 20 * 60_000 : durationForTier(state.selection.tier);
    dispatch({ type: "ROUND_STARTED", now, durationMs });

    play("start");
    haptics.impact("light");

    if (useSessionFlow) {
      inFlightRef.current = false;
      return join ?? { ok: true, mode: "play", phase: "LIVE", sessionId: "" };
    }

    // --- VRF Settlement Flow (async; SIM now, ONCHAIN later) ---
    const roundId = cryptoRandomId();

    try{
      const player = getPlayerHeaders();
      const setup = {
        roundId,
        playerRef: player.playerRef,
        sessionId: join?.sessionId ?? null,
        direction: state.selection.direction,
        tier: state.selection.tier,
        wagerTokens: 1,
        createdAt: Date.now(),
        playToken
      } as const;

      const pending = await vrf.request(setup);
      dispatch({
        type: "SETTLEMENT_REQUESTED",
        roundId,
        provider: pending.provider,
        requestId: pending.requestId,
        submittedAt: pending.submittedAt
      });

      const fulfilled = await vrf.awaitFulfill(pending);
      const serverRound = (fulfilled as any)?.round;
      const serverProfile = (fulfilled as any)?.profile;

      const result = serverRound
        ? buildResultFromServer(serverRound)
        : vrf.deriveResult({ setup, fulfilled });

      const pointsTotal = typeof serverProfile?.points === "number" ? serverProfile.points : undefined;
      const streakTotal = typeof serverProfile?.streak === "number" ? serverProfile.streak : undefined;

      // Ensure result appears after the live animation window (tight polish)
      const minResolveAt = now + durationMs;
      const wait = Math.max(0, minResolveAt - Date.now());
      if(wait) await new Promise(r => setTimeout(r, wait));

      dispatch({ type: "ROUND_RESOLVED", result, pointsTotal, streakTotal });

      if(result.outcome === "WIN"){
        play("win");
        haptics.notification("success");
      } else {
        play("miss");
        haptics.notification("error");
      }
    } catch (err) {
      logError("useGameMachine/vrfSettlement", err);
      dispatch({ type: "ACK_RESULT" });
      return { ok: false, reason: "JOIN_FAILED" };
    } finally {
      inFlightRef.current = false;
    }
    return join ?? { ok: true, mode: "play", phase: "LIVE", sessionId: "" };
  };

  const resumeSession = async (sessionId: string): Promise<JoinOutcome> => {
    if (inFlightRef.current) return { ok: false, reason: "BUSY" };
    if (!sessionId) return { ok: false, reason: "NO_SESSIONS" };

    inFlightRef.current = true;
    try {
      const player = getPlayerHeaders();
      const resumeRes = await fetch(`${API_BASE}/api/sessions/${sessionId}/resume`, {
        method: "POST",
        headers: buildHeaders(player)
      });
      const resumeJson = await readJson(resumeRes);
      const resumeError = typeof resumeJson?.error === "string" ? resumeJson.error : undefined;
      if (!resumeRes.ok) {
        if (resumeRes.status === 404) return { ok: false, reason: "NO_SESSIONS", status: resumeRes.status, error: resumeError };
        if (resumeRes.status === 409) return { ok: false, reason: "NOT_JOINABLE", status: resumeRes.status, error: resumeError };
        if (resumeRes.status === 401) return { ok: false, reason: "UNAUTHORIZED", status: resumeRes.status, error: resumeError };
        return { ok: false, reason: "JOIN_FAILED", status: resumeRes.status, error: resumeError };
      }

      const mode = resumeJson?.join === "spectate" ? "spectate" : "play";
      const phase = (resumeJson?.phase ?? (mode === "spectate" ? "CLOSING" : "LIVE")) as JoinPhase;
      const resolvedId = String(resumeJson?.sessionId ?? sessionId);

      dispatch({ type: "JOIN_UPDATED", join: { mode, phase, sessionId: resolvedId } });
      dispatch({ type: "NAVIGATE", view: "live" });
      return { ok: true, mode, phase, sessionId: resolvedId };
    } catch {
      return { ok: false, reason: "JOIN_FAILED", error: "NETWORK_ERROR" };
    } finally {
      inFlightRef.current = false;
    }
  };

  const acknowledgeResult = () => {
    play("tap");
    haptics.impact("light");
    dispatch({ type: "ACK_RESULT" });
  };

  useEffect(() => {
    return () => { inFlightRef.current = false; };
  }, []);

  return { state, dispatch, navigate, playRound, resumeSession, acknowledgeResult };
}

export type GameAPI = ReturnType<typeof useGameMachine>;

function cryptoRandomId(){
  try{
    // browser crypto
    const a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return Array.from(a).map(b=>b.toString(16).padStart(2,"0")).join("");
  } catch {
    return `rnd_${Date.now()}_${fallbackCounter++}`;
  }
}

let fallbackCounter = 0;

function buildHeaders(player: PlayerHeaders, extra?: Record<string, string>) {
  return {
    "content-type": "application/json",
    "x-printr-player": player.playerRef,
    ...(player.walletPubkey ? { "x-printr-wallet": player.walletPubkey } : {}),
    ...(extra ?? {})
  };
}

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
