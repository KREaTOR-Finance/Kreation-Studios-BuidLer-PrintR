import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Card } from "../components/Card";
import { ListRow } from "../components/ListRow";
import { Badge } from "../components/Badge";
import { useGame } from "../navigation/GameContext";

const mockLeaderboard = [
  { name: "NEONWOLF", points: 24550, streak: 18, tier: "LEGEND" },
  { name: "ARCADIA", points: 22110, streak: 14, tier: "BOLD" },
  { name: "BYTEKING", points: 19840, streak: 12, tier: "SAFE" },
  { name: "VORTEX", points: 17320, streak: 10, tier: "BOLD" },
  { name: "CIPHER", points: 15800, streak: 9, tier: "SAFE" },
];

export function LeaderboardScreen() {
  const { state } = useGame();

  const rows = [
    ...mockLeaderboard,
    { name: "YOU", points: state.points, streak: state.streak, tier: state.selection.tier },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card title="Weekly Leaderboard" subtitle="Top players this week by points.">
        {rows.map((row, i) => (
          <ListRow
            key={`${row.name}_${i}`}
            left={`${i + 1}. ${row.name}`}
            sub={`Streak ${row.streak} | ${row.tier}`}
            right={<Badge text={row.points.toLocaleString()} tone={row.name === "YOU" ? "teal" : "blue"} />}
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
