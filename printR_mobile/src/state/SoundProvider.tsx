import React, { createContext, useContext, useEffect, useRef, useMemo } from "react";
import { Platform } from "react-native";

type SoundName = "tap" | "start" | "win" | "miss";
type SoundAPI = { play: (name: SoundName) => void };

const Ctx = createContext<SoundAPI>({ play: () => {} });

const noop: SoundAPI = { play: () => {} };

export function SoundProvider({ children }: { children: React.ReactNode }) {
  if (Platform.OS === "web") return <Ctx.Provider value={noop}>{children}</Ctx.Provider>;

  const { Audio } = require("expo-av") as typeof import("expo-av");

  const soundFiles: Record<SoundName, any> = {
    tap: require("../../assets/sfx/tap.mp3"),
    start: require("../../assets/sfx/start.mp3"),
    win: require("../../assets/sfx/win.mp3"),
    miss: require("../../assets/sfx/miss.mp3"),
  };

  const soundsRef = useRef<Map<SoundName, InstanceType<typeof Audio.Sound>>>(new Map());

  useEffect(() => {
    const loadAll = async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      } catch {}
      for (const [name, file] of Object.entries(soundFiles)) {
        try {
          const { sound } = await Audio.Sound.createAsync(file);
          soundsRef.current.set(name as SoundName, sound);
        } catch {}
      }
    };
    loadAll();
    return () => {
      soundsRef.current.forEach((s) => s.unloadAsync().catch(() => {}));
    };
  }, []);

  const api = useMemo<SoundAPI>(
    () => ({
      play: (name: SoundName) => {
        const sound = soundsRef.current.get(name);
        if (!sound) return;
        try {
          sound.setPositionAsync(0).then(() => sound.playAsync()).catch(() => {});
        } catch {}
      },
    }),
    []
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useSounds() {
  return useContext(Ctx);
}
