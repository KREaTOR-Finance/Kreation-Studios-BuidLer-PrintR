import React from "react";
import { ScrollView, Text, StyleSheet } from "react-native";
import { Card } from "../components/Card";
import { ListRow } from "../components/ListRow";
import { Badge } from "../components/Badge";
import { useGame } from "../navigation/GameContext";
import { useWallet } from "../state/WalletProvider";

const mockLeaderboard = [
  { name: "neonwolf.sol", points: 24550, streak: 18, tier: "LEGEND", isWallet: true },
  { name: "arcadia.sol", points: 22110, streak: 14, tier: "BOLD", isWallet: true },
  { name: "BYTEKING", points: 19840, streak: 12, tier: "SAFE", isWallet: false },
  { name: "vortex.sol", points: 17320, streak: 10, tier: "BOLD", isWallet: true },
  { name: "CIPHER", points: 15800, streak: 9, tier: "SAFE", isWallet: false },
];

export function LeaderboardScreen() {
  const { state } = useGame();
  const { snsName, publicKeyStr, connected } = useWallet();

  // Display name for the current player
  const playerDisplayName = snsName
    ?? (publicKeyStr ? `${publicKeyStr.slice(0, 4)}...${publicKeyStr.slice(-4)}` : "YOU");

  const rows = [
    ...mockLeaderboard,
    {
      name: playerDisplayName,
      points: state.points,
      streak: state.streak,
      tier: state.selection.tier,
      isWallet: connected,
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card title="Weekly Leaderboard" subtitle="Top players this week by points.">
        {rows.map((row, i) => (
          <ListRow
            key={`${row.name}_${i}`}
            left={`${i + 1}. ${row.name}`}
            sub={`Streak ${row.streak} | ${row.tier}${row.isWallet ? " | Wallet" : ""}`}
            right={
              <Badge
                text={row.points.toLocaleString()}
                tone={row.name === playerDisplayName ? "teal" : "blue"}
              />
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
});
