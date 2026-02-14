import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useGame } from "../navigation/GameContext";
import { usePlayerHeaders } from "../hooks/usePlayerHeaders";
import { useCreditsBalance } from "../hooks/useCreditsBalance";
import { TopStats } from "../components/TopStats";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { colors, glows } from "../theme/colors";
import { spacing, radius } from "../theme/spacing";
import { typography } from "../theme/typography";

export default function ResultScreen() {
  const game = useGame();
  const { state, acknowledgeResult } = game;
  const playerHeaders = usePlayerHeaders();
  const { sessionsBalance } = useCreditsBalance(playerHeaders);

  const result = state.result;
  const isWin = result?.outcome === "WIN";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Top Stats Bar */}
      <TopStats
        points={state.points}
        streak={state.streak}
        sessions={sessionsBalance}
      />

      {/* Result Card */}
      <Card>
        <View style={styles.resultContainer}>
          {/* Outcome glow circle */}
          <View
            style={[
              styles.outcomeCircle,
              { backgroundColor: isWin ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" },
            ]}
          >
            <Text
              style={[
                styles.outcomeText,
                { color: isWin ? colors.stateWin : colors.stateLoss },
              ]}
            >
              {isWin ? "WIN" : "MISS"}
            </Text>
          </View>

          {/* Points delta */}
          {result ? (
            <Text
              style={[
                styles.pointsDelta,
                { color: isWin ? colors.stateWin : colors.stateLoss },
              ]}
            >
              {isWin ? "+" : ""}
              {result.pointsDelta.toLocaleString()} pts
            </Text>
          ) : null}

          {/* Streak delta */}
          {result ? (
            <View style={styles.streakRow}>
              <Text style={styles.streakLabel}>STREAK</Text>
              <Text
                style={[
                  styles.streakDelta,
                  { color: result.streakDelta >= 0 ? colors.stateWin : colors.stateLoss },
                ]}
              >
                {result.streakDelta >= 0 ? "+" : ""}
                {result.streakDelta}
              </Text>
            </View>
          ) : null}

          {/* Details badges */}
          {result ? (
            <View style={styles.detailsRow}>
              <Badge text={result.tier} tone={result.tier === "SAFE" ? "blue" : result.tier === "BOLD" ? "purple" : "warn"} />
              <Badge text={result.direction} tone={result.direction === "UP" ? "win" : "warn"} />
            </View>
          ) : null}

          {/* Reason / mastery copy */}
          {result?.reason ? (
            <Text style={styles.reasonText}>{result.reason}</Text>
          ) : null}

          {/* Continue button */}
          <View style={styles.buttonContainer}>
            <Button onPress={acknowledgeResult}>
              CONTINUE
            </Button>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    padding: spacing.lg,
    paddingTop: 56,
  },
  resultContainer: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },

  // Outcome circle
  outcomeCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  outcomeText: {
    ...typography.display,
    fontSize: 42,
    letterSpacing: 3,
  },

  // Points
  pointsDelta: {
    ...typography.heading,
    fontSize: 28,
    fontVariant: ["tabular-nums"],
    marginBottom: spacing.md,
  },

  // Streak
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  streakLabel: {
    ...typography.label,
    fontSize: 10,
    color: colors.textMuted,
  },
  streakDelta: {
    ...typography.heading,
    fontSize: 16,
    fontVariant: ["tabular-nums"],
  },

  // Details
  detailsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  // Reason
  reasonText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },

  // Button
  buttonContainer: {
    width: "100%",
    paddingHorizontal: spacing.lg,
  },
});
