import { useEffect, useState } from "react";
import type { PlayerHeaders } from "../network/httpClient";
import { getPlayerHeaders, getPlayerHeadersSync } from "../state/player";

export function usePlayerHeaders(): PlayerHeaders | null {
  const [headers, setHeaders] = useState<PlayerHeaders | null>(() => {
    const sync = getPlayerHeadersSync();
    return sync.playerRef !== "mobile:demo" ? sync : null;
  });

  useEffect(() => {
    getPlayerHeaders().then(setHeaders);
  }, []);

  return headers;
}
