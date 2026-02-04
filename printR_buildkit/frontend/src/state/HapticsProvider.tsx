import React, { createContext, useContext, useMemo } from "react";

type ImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
type NotificationType = "success" | "warning" | "error";

type HapticsAPI = {
  impact: (style: ImpactStyle) => void;
  notification: (type: NotificationType) => void;
  selection: () => void;
};

const Ctx = createContext<HapticsAPI>({
  impact: () => {},
  notification: () => {},
  selection: () => {}
});

function getTelegramHaptics(){
  const tg = (window as any).Telegram?.WebApp;
  const hf = tg?.HapticFeedback;
  return hf;
}

export function HapticsProvider({ children }: { children: React.ReactNode }){
  const api = useMemo<HapticsAPI>(() => {
    const hf = getTelegramHaptics();

    return {
      impact: (style) => {
        try { hf?.impactOccurred(style); } catch {}
      },
      notification: (type) => {
        try { hf?.notificationOccurred(type); } catch {}
      },
      selection: () => {
        try { hf?.selectionChanged(); } catch {}
      }
    };
  }, []);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useHaptics(){ return useContext(Ctx); }
