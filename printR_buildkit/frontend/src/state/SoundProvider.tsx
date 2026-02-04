import React, { createContext, useContext, useMemo, useEffect, useRef } from "react";
import { logError } from "../utils/errorLogger";

type SoundName = "tap" | "start" | "win" | "miss";
type SoundAPI = { play: (name: SoundName) => void };

const Ctx = createContext<SoundAPI>({ play: () => {} });

export function SoundProvider({ children }: { children: React.ReactNode }){
  const audioFilesRef = useRef<Map<SoundName, HTMLAudioElement>>(new Map());
  const audioFilesLoaded = useRef(false);

  // Try to preload audio files
  useEffect(() => {
    const soundFiles: Record<SoundName, string> = {
      tap: "/sfx/tap.mp3",
      start: "/sfx/start.mp3",
      win: "/sfx/win.mp3",
      miss: "/sfx/miss.mp3",
    };

    let loadedCount = 0;
    const totalSounds = Object.keys(soundFiles).length;

    Object.entries(soundFiles).forEach(([name, path]) => {
      const audio = new Audio(path);
      audio.preload = "auto";
      audio.volume = 0.5;

      audio.addEventListener("canplaythrough", () => {
        audioFilesRef.current.set(name as SoundName, audio);
        loadedCount++;
        if (loadedCount === totalSounds) {
          audioFilesLoaded.current = true;
        }
      }, { once: true });

      audio.addEventListener("error", () => {
        // File doesn't exist, will use WebAudio fallback
      }, { once: true });

      audio.load();
    });
  }, []);

  const sounds = useMemo(() => {
    // WebAudio context for fallback beeps
    let ctx: AudioContext | null = null;
    const getCtx = () => {
      if (!ctx) {
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      return ctx;
    };

    const beep = (freq: number, ms: number, gain = 0.06) => {
      try {
        const audioCtx = getCtx();
        if (audioCtx.state === "suspended") audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        g.gain.value = gain;
        osc.connect(g);
        g.connect(audioCtx.destination);
        osc.start();
        setTimeout(() => { osc.stop(); }, ms);
      } catch (err) {
        logError("SoundProvider/beep", err);
      }
    };

    const playFallback = (name: SoundName) => {
      switch (name) {
        case "tap":
          return beep(520, 55, 0.035);
        case "start":
          beep(320, 80, 0.04);
          beep(420, 80, 0.04);
          return;
        case "win":
          beep(660, 90, 0.05);
          setTimeout(() => beep(880, 120, 0.05), 95);
          return;
        case "miss":
          beep(220, 120, 0.045);
          setTimeout(() => beep(180, 150, 0.04), 110);
          return;
      }
    };

    const play = (name: SoundName) => {
      // Try audio file first
      const audioFile = audioFilesRef.current.get(name);
      if (audioFile) {
        try {
          audioFile.currentTime = 0;
          audioFile.play().catch(() => playFallback(name));
          return;
        } catch {
          // Fall through to WebAudio
        }
      }
      // Fallback to WebAudio beeps
      playFallback(name);
    };

    return { play };
  }, []);

  return <Ctx.Provider value={sounds}>{children}</Ctx.Provider>;
}

export function useSounds() { return useContext(Ctx); }
