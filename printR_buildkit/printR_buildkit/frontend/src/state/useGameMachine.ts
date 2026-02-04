import { useEffect, useReducer, useRef } from "react";
import { initialState, reducer } from "./machine";
import type { View } from "./machine";
import { useSounds } from "./SoundProvider";
import { useHaptics } from "./HapticsProvider";
import { SimVrfAdapter } from "./vrf";
import { createSwitchboardSrsProgramEnforcedAdapter } from "./solanaOnChainVrfAdapter";

// NOTE: Swap adapters without changing UI.
// For now default is SIM; set `window.__PRINTR_VRF="ONCHAIN"` to test ONCHAIN flow UI.
const vrf = (typeof window !== "undefined" && (window as any).__PRINTR_VRF === "ONCHAIN")
  ? createSwitchboardSrsProgramEnforcedAdapter({ connection: null, wallet: null, programId: "Pr1ntr1111111111111111111111111111111111111" })
  : SimVrfAdapter;

export function useGameMachine(){
  const [state, dispatch] = useReducer(reducer, initialState);
  const inFlightRef = useRef(false);
  const { play } = useSounds();
  const haptics = useHaptics();

  const navigate = (view: View) => {
    play("tap");
    haptics.selection();
    dispatch({ type: "NAVIGATE", view });
  };

  const playRound = async () => {
    if(inFlightRef.current) return;
    if(state.view === "live") return;

    dispatch({ type: "PLAY_REQUESTED" });

    const now = Date.now();
    const durationMs = state.selection.tier === "SAFE" ? 5200 : state.selection.tier === "BOLD" ? 6200 : 7200;
    dispatch({ type: "ROUND_STARTED", now, durationMs });

    play("start");
    haptics.impact("light");

    // --- VRF Settlement Flow (async; SIM now, ONCHAIN later) ---
    inFlightRef.current = true;
    const roundId = cryptoRandomId();

    try{
      const setup = {
        roundId,
        playerRef: "telegram_or_wallet", // TODO: wire Telegram ID + wallet pubkey
        direction: state.selection.direction,
        tier: state.selection.tier,
        wagerTokens: 1,
        createdAt: Date.now()
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
      const result = vrf.deriveResult({ setup, fulfilled });

      // Ensure result appears after the live animation window (tight polish)
      const minResolveAt = now + durationMs;
      const wait = Math.max(0, minResolveAt - Date.now());
      if(wait) await new Promise(r => setTimeout(r, wait));

      dispatch({ type: "ROUND_RESOLVED", result });

      if(result.outcome === "WIN"){
        play("win");
        haptics.notification("success");
      } else {
        play("miss");
        haptics.notification("error");
      }
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

  return { state, dispatch, navigate, playRound, acknowledgeResult };
}

export type GameAPI = ReturnType<typeof useGameMachine>;

function cryptoRandomId(){
  try{
    // browser crypto
    const a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return Array.from(a).map(b=>b.toString(16).padStart(2,"0")).join("");
  } catch {
    return "rnd_" + Math.random().toString(16).slice(2);
  }
}
