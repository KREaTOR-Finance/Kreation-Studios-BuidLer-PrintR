import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { spacing, radius } from "../theme/spacing";
import { typography } from "../theme/typography";

interface TopStatsProps {
  points: number | null;
  streak: number | null;
  sessions: number | null;
}

export const TopStats: React.FC<TopStatsProps> = ({
  points,
  streak,
  sessions,
}) => {
  return (
    <View style={styles.row}>
      <StatPill
        label="POINTS"
        value={points != null ? points.toLocaleString() : "--"}
        color={colors.primaryBlue}
      />
      <StatPill
        label="STREAK"
        value={streak != null ? `${streak}d` : "--"}
        color={colors.stateWarn}
      />
      <StatPill
        label="SESSIONS"
        value={sessions != null ? sessions.toLocaleString() : "--"}
        color={colors.accentTeal}
      />
    </View>
  );
};

interface StatPillProps {
  label: string;
  value: string;
  color: string;
}

const StatPill: React.FC<StatPillProps> = ({ label, value, color }) => {
  return (
    <View style={styles.pill}>
      <Text style={[styles.pillValue, { color }]}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  pill: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
  },
  pillValue: {
    ...typography.heading,
    fontSize: 20,
    fontVariant: ["tabular-nums"],
  },
  pillLabel: {
    ...typography.label,
    fontSize: 9,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
