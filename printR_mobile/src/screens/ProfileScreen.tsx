import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView } from "react-native";
import { Card } from "../components/Card";
import { TopStats } from "../components/TopStats";
import { Avatar } from "../components/Avatar";
import { useGame } from "../navigation/GameContext";
import { usePlayerHeaders } from "../hooks/usePlayerHeaders";
import { useCreditsBalance } from "../hooks/useCreditsBalance";
import { colors } from "../theme/colors";

export function ProfileScreen() {
  const { state } = useGame();
  const player = usePlayerHeaders();
  const { sessionsBalance } = useCreditsBalance(player);
  const [name, setName] = useState("Player");

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TopStats points={state.points} streak={state.streak} sessions={sessionsBalance} />

      <Card title="Profile">
        <View style={styles.avatarRow}>
          <Avatar seed={player?.playerRef ?? "default"} size={64} />
          <View style={styles.avatarInfo}>
            <Text style={styles.label}>Sessions Balance</Text>
            <Text style={styles.value}>{sessionsBalance ?? "--"}</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Nickname</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholderTextColor="rgba(241,245,249,0.4)"
            placeholder="Enter nickname"
          />
        </View>

        <View style={styles.statsGrid}>
          {[
            { label: "Tokens", value: String(state.tokens) },
            { label: "Best Streak", value: String(state.streak) },
            { label: "Tier", value: state.selection.tier },
            { label: "Direction", value: state.selection.direction },
          ].map((s) => (
            <View key={s.label} style={styles.statBox}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.refRow}>
          <Text style={[styles.label, { opacity: 0.6 }]}>Player Ref</Text>
          <Text style={[styles.caption, { opacity: 0.5 }]}>{player?.playerRef ?? "loading..."}</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16 },
  avatarInfo: { flex: 1 },
  field: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", color: colors.textMuted, marginBottom: 6 },
  value: { fontSize: 22, fontWeight: "800", color: colors.textPrimary },
  input: { borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 12, padding: 12, color: colors.textPrimary, fontSize: 14, backgroundColor: colors.surfaceInput },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  statBox: { width: "47%", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.surfaceInput },
  statLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", color: colors.textMuted },
  statValue: { fontSize: 16, fontWeight: "800", color: colors.textPrimary, marginTop: 4 },
  caption: { fontSize: 12, color: colors.textMuted },
  refRow: { marginTop: 14 },
});
