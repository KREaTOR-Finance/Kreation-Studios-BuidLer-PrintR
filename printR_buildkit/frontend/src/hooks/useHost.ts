import { useEffect, useMemo, useState } from "react";
import { getHostMode, getPlayerRef, hostReady, type HostMode } from "../host/hostBridge";

export function useHost() {
  const [mode, setMode] = useState<HostMode>(getHostMode());

  useEffect(() => {
    hostReady();
    setMode(getHostMode());
  }, []);

  const playerRef = useMemo(() => getPlayerRef(), [mode]);
  return { mode, playerRef };
}
