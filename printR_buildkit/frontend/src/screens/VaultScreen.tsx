import React, { useEffect, useState } from "react";
import { Card } from "../components/Card";
import { TopStats } from "../components/TopStats";
import { ListRow } from "../components/ListRow";
import { Badge } from "../components/Badge";
import { EmptyState } from "../components/EmptyState";
import type { GameAPI } from "../state/useGameMachine";
import { apiGet, apiPost } from "../network/httpClient";
import { getPlayerHeaders } from "../state/player";

export function VaultScreen({ game }:{ game:GameAPI }){
  const { state, dispatch } = game;
  const [prizes, setPrizes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const load = () => {
    const player = getPlayerHeaders();
    apiGet<{ ok: boolean; profile: any; prizes: any[] }>("/api/prizes", player)
      .then((data) => {
        setPrizes(Array.isArray(data?.prizes) ? data.prizes : []);
        if (data?.profile && typeof data.profile.points === "number" && typeof data.profile.streak === "number") {
          dispatch({ type: "PROFILE_SYNCED", points: data.profile.points, streak: data.profile.streak });
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load prize vault.");
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const handleClaim = async (prizeId: string, status: string) => {
    if (status !== "CLAIMABLE" || claimingId) return;
    setClaimingId(prizeId);
    const player = getPlayerHeaders();
    try {
      const data = await apiPost<{ ok: boolean; profile: any }>(`/api/prizes/${prizeId}/claim`, {}, player);
      if (data?.profile && typeof data.profile.points === "number" && typeof data.profile.streak === "number") {
        dispatch({ type: "PROFILE_SYNCED", points: data.profile.points, streak: data.profile.streak });
      }
      load();
    } catch {
      setError("Unable to claim prize right now.");
    } finally {
      setClaimingId(null);
    }
  };

  const hasAny = prizes.length > 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap: 14 }}>
      <TopStats points={state.points} streak={state.streak} sessions={null} />

      <Card>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
          <div style={{fontFamily:"var(--font-display)", fontWeight:900, letterSpacing:1.2, fontSize:24}}>Prize Vault</div>
          <div style={{opacity:0.85}}>Points <b>{state.points}</b></div>
        </div>
        <div style={{marginTop:10, fontSize:12, opacity:0.82}}>
          Redeem points for prizes, cosmetics, and drops. Points are not money and are not withdrawable.
        </div>

        <div style={{marginTop:14, display:"grid", gap: 10}}>
          {loading && (
            <ListRow left="Loading prizes..." sub="Fetching your vault." />
          )}
          {!loading && error && (
            <ListRow left="Vault unavailable" sub={error} />
          )}
          {!loading && !error && !hasAny && (
            <EmptyState title="No prizes yet" sub="Play to earn points and unlock your first drops." />
          )}
          {!loading && !error && hasAny && prizes.map((p) => {
            const status = p.status ?? "LOCKED";
            const label = status === "CLAIMABLE" ? "Claimable" : status === "CLAIMED" ? "Claimed" : "Locked";
            const tone = status === "CLAIMABLE" ? "win" : status === "LOCKED" ? "warn" : "blue";
            const busy = claimingId === p.id;
            const onClick = status === "CLAIMABLE" ? () => handleClaim(p.id, status) : undefined;

            return (
              <ListRow
                key={p.id}
                left={p.name}
                sub={`Cost: ${Number(p.costPoints ?? 0).toLocaleString()} points`}
                right={<Badge text={busy ? "Claiming" : label} tone={tone} />}
                onClick={onClick}
              />
            );
          })}
        </div>

        <div style={{marginTop:14, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.10)", fontSize:12, opacity:0.78}}>
          Claims are tracked to your PrintR profile and can be fulfilled later.
        </div>
      </Card>
    </div>
  );
}
