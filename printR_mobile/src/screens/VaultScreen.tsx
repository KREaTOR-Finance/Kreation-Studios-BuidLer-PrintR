import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Card } from "../components/Card";
import { TopStats } from "../components/TopStats";
import { Badge } from "../components/Badge";
import { ListRow } from "../components/ListRow";
import { useGame } from "../navigation/GameContext";
import { usePlayerHeaders } from "../hooks/usePlayerHeaders";
import { useCreditsBalance } from "../hooks/useCreditsBalance";
import { apiGet, apiPost } from "../network/httpClient";
import { colors } from "../theme/colors";

type Prize = {
  id: string;
  name: string;
  pointCost: number;
  status: "claimable" | "locked" | "claimed";
};

export function VaultScreen() {
  const { state } = useGame();
  const player = usePlayerHeaders();
  const { sessionsBalance } = useCreditsBalance(player);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!player) return;
    apiGet<Prize[]>("/api/prizes", player)
      .then((data) => setPrizes(Array.isArray(data) ? data : []))
      .catch(() => setPrizes([
        { id: "1", name: "Custom Avatar Frame", pointCost: 5000, status: "claimable" },
        { id: "2", name: "Double XP Weekend", pointCost: 10000, status: "locked" },
        { id: "3", name: "Exclusive Badge", pointCost: 2500, status: "claimed" },
      ]))
      .finally(() => setLoading(false));
  }, [player?.playerRef]);

  const handleClaim = async (prize: Prize) => {
    if (!player || prize.status !== "claimable") return;
    try {
      await apiPost("/api/prizes", { prizeId: prize.id }, player);
      setPrizes((prev) => prev.map((p) => (p.id === prize.id ? { ...p, status: "claimed" as const } : p)));
    } catch {}
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TopStats points={state.points} streak={state.streak} sessions={sessionsBalance} />

      <Card title="Prize Vault" subtitle="Redeem points for rewards.">
        {loading && <ActivityIndicator color={colors.accentTeal} />}
        {!loading && prizes.length === 0 && (
          <Text style={styles.empty}>No prizes available yet.</Text>
        )}
        {!loading &&
          prizes.map((prize) => (
            <ListRow
              key={prize.id}
              left={prize.name}
              sub={`${prize.pointCost.toLocaleString()} points`}
              right={
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Badge
                    text={prize.status === "claimed" ? "Claimed" : prize.status === "locked" ? "Locked" : "Available"}
                    tone={prize.status === "claimed" ? "purple" : prize.status === "locked" ? "warn" : "win"}
                  />
                  {prize.status === "claimable" && (
                    <Pressable style={styles.claimBtn} onPress={() => handleClaim(prize)}>
                      <Text style={styles.claimText}>Claim</Text>
                    </Pressable>
                  )}
                </View>
              }
            />
          ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  empty: { color: colors.textMuted, fontSize: 13 },
  claimBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.borderActive, backgroundColor: colors.surfaceInput },
  claimText: { color: colors.textSecondary, fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
});
