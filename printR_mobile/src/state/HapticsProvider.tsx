import React, { createContext, useContext, useMemo } from "react";
import { Platform } from "react-native";

type ImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
type NotificationType = "success" | "warning" | "error";

type HapticsAPI = {
  impact: (style: ImpactStyle) => void;
  notification: (type: NotificationType) => void;
  selection: () => void;
};

const noop: HapticsAPI = {
  impact: () => {},
  notification: () => {},
  selection: () => {},
};

const Ctx = createContext<HapticsAPI>(noop);

export function HapticsProvider({ children }: { children: React.ReactNode }) {
  const api = useMemo<HapticsAPI>(() => {
    if (Platform.OS === "web") return noop;
    // Lazy-require so the native module never loads on web
    try {
      const Haptics = require("expo-haptics");
      return {
        impact: (style: ImpactStyle) => {
          try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
        },
        notification: (type: NotificationType) => {
          try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        },
        selection: () => {
          try { Haptics.selectionAsync(); } catch {}
        },
      };
    } catch {
      return noop;
    }
  }, []);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useHaptics() {
  return useContext(Ctx);
}
