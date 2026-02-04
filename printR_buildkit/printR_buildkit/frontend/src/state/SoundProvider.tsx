import React, { createContext, useContext, useMemo } from "react";

type SoundName = "tap" | "start" | "win" | "miss";
type SoundAPI = { play: (name: SoundName) => void };

const Ctx = createContext<SoundAPI>({ play: () => {} });

export function SoundProvider({ children }: { children: React.ReactNode }){
  const sounds = useMemo(() => {
    // NOTE: Replace with actual .mp3/.wav in /public/sfx later.
    // For now we use simple WebAudio beeps so it works immediately.
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const beep = (freq: number, ms: number, gain=0.06) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      setTimeout(() => { osc.stop(); }, ms);
    };

    const play = (name: SoundName) => {
      try { if(ctx.state === "suspended") ctx.resume(); } catch {}
      switch(name){
        case "tap":   return beep(520, 55, 0.035);
        case "start": return (beep(320, 80, 0.04), beep(420, 80, 0.04));
        case "win":   return (beep(660, 90, 0.05), setTimeout(()=>beep(880, 120, 0.05), 95));
        case "miss":  return (beep(220, 120, 0.045), setTimeout(()=>beep(180, 150, 0.04), 110));
      }
    };

    return { play };
  }, []);

  return <Ctx.Provider value={sounds}>{children}</Ctx.Provider>;
}

export function useSounds(){ return useContext(Ctx); }
