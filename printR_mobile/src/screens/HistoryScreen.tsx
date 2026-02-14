import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Card } from "../components/Card";
import { ListRow } from "../components/ListRow";
import { Badge } from "../components/Badge";
import { useGame } from "../navigation/GameContext";

const mockHighscores = [
  { session: "AutoAsset-1", player: "NEONWOLF", points: 86790, tier: "BOLD" },
  { session: "AutoAsset-2", player: "ARCADIA", points: 74210, tier: "SAFE" },
  { session: "AutoAsset-3", player: "BYTEKING", points: 68950, tier: "LEGEND" },
  { session: "AutoAsset-4", player: "VORTEX", points: 55120, tier: "BOLD" },
];

export function HistoryScreen() {
  const { state } = useGame();

  const rows = [
    ...mockHighscores,
    { session: "Personal Best", player: "YOU", points: state.points, tier: state.selection.tier },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card title="Session Highscores" subtitle="Best single-session scores from live play.">
        {rows.map((row, i) => (
          <ListRow
            key={`${row.session}_${row.player}`}
            left={`${i + 1}. ${row.player}`}
            sub={`${row.session} | ${row.tier}`}
            right={<Badge text={row.points.toLocaleString()} tone={row.player === "YOU" ? "teal" : "purple"} />}
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
