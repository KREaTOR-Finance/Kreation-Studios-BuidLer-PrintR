/**
 * Host Bridge
 * One React build runs in:
 * - web browser
 * - Telegram WebApp (Mini App)
 *
 * We detect Telegram at runtime and expose a small API:
 * - getHostMode()
 * - getPlayerRef()  (tg:<id> or web:<uuid>)
 * - openLink(url)
 * - haptics.*
 */
export type HostMode = "telegram" | "web";

declare global {
  interface Window {
    Telegram?: any;
  }
}

export function getHostMode(): HostMode {
  const tg = window.Telegram?.WebApp;
  return tg?.initData ? "telegram" : "web";
}

export function tgUserId(): string | null {
  try {
    const tg = window.Telegram?.WebApp;
    const id = tg?.initDataUnsafe?.user?.id;
    return typeof id === "number" || typeof id === "string" ? String(id) : null;
  } catch {
    return null;
  }
}

function getOrCreateWebId(): string {
  const key = "printr_web_player_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const v = crypto?.randomUUID ? crypto.randomUUID() : fallbackWebId();
  localStorage.setItem(key, v);
  return v;
}

let fallbackCounter = 0;
function fallbackWebId(): string {
  fallbackCounter += 1;
  return `${Date.now()}-${fallbackCounter.toString(16)}`;
}

export function getPlayerRef(): string {
  const mode = getHostMode();
  if (mode === "telegram") {
    const id = tgUserId();
    return `tg:${id ?? "unknown"}`;
  }
  return `web:${getOrCreateWebId()}`;
}

export function hostReady(): void {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    try {
      tg.ready();
      tg.expand();
    } catch {}
  }
}

export function openLink(url: string): void {
  const tg = window.Telegram?.WebApp;
  if (tg?.openLink) tg.openLink(url);
  else window.location.href = url;
}

export const haptics = {
  light() {
    const tg = window.Telegram?.WebApp;
    tg?.HapticFeedback?.impactOccurred?.("light");
    if (!tg) navigator?.vibrate?.(10);
  },
  medium() {
    const tg = window.Telegram?.WebApp;
    tg?.HapticFeedback?.impactOccurred?.("medium");
    if (!tg) navigator?.vibrate?.(20);
  },
  heavy() {
    const tg = window.Telegram?.WebApp;
    tg?.HapticFeedback?.impactOccurred?.("heavy");
    if (!tg) navigator?.vibrate?.(30);
  },
  success() {
    const tg = window.Telegram?.WebApp;
    tg?.HapticFeedback?.notificationOccurred?.("success");
    if (!tg) navigator?.vibrate?.([10, 30, 10]);
  },
  error() {
    const tg = window.Telegram?.WebApp;
    tg?.HapticFeedback?.notificationOccurred?.("error");
    if (!tg) navigator?.vibrate?.([30, 10, 30]);
  }
};
