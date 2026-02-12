import React, { createContext, useContext, useMemo } from "react";
import * as Haptics from "expo-haptics";

type ImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
type NotificationType = "success" | "warning" | "error";

type HapticsAPI = {
  impact: (style: ImpactStyle) => void;
  notification: (type: NotificationType) => void;
  selection: () => void;
};

const styleMap: Record<ImpactStyle, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
  rigid: Haptics.ImpactFeedbackStyle.Heavy,
  soft: Haptics.ImpactFeedbackStyle.Light,
};

const notifMap: Record<NotificationType, Haptics.NotificationFeedbackType> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

const Ctx = createContext<HapticsAPI>({
  impact: () => {},
  notification: () => {},
  selection: () => {},
});

export function HapticsProvider({ children }: { children: React.ReactNode }) {
  const api = useMemo<HapticsAPI>(
    () => ({
      impact: (style) => {
        try { Haptics.impactAsync(styleMap[style]); } catch {}
      },
      notification: (type) => {
        try { Haptics.notificationAsync(notifMap[type]); } catch {}
      },
      selection: () => {
        try { Haptics.selectionAsync(); } catch {}
      },
    }),
    []
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useHaptics() {
  return useContext(Ctx);
}
