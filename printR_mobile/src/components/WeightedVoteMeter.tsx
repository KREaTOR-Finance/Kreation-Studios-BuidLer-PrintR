import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "../theme/colors";
import { spacing, radius } from "../theme/spacing";
import { typography } from "../theme/typography";

interface WeightedVoteMeterProps {
  votePower: number;
  maxPower: number;
  label?: string;
}

export const WeightedVoteMeter: React.FC<WeightedVoteMeterProps> = ({
  votePower,
  maxPower,
  label,
}) => {
  const ratio = maxPower > 0 ? Math.min(votePower / maxPower, 1) : 0;
  const percentage = Math.round(ratio * 100);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label ?? "YOUR VOTE POWER"}</Text>
        <Text style={styles.value}>
          {votePower.toLocaleString()}{" "}
          <Text style={styles.max}>/ {maxPower.toLocaleString()}</Text>
        </Text>
      </View>

      {/* Meter bar */}
      <View style={styles.meterTrack}>
        <LinearGradient
          colors={gradients.primaryBtn}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.meterFill,
            { width: `${percentage}%` as unknown as number },
          ]}
        />
      </View>

      {/* Tick marks */}
      <View style={styles.ticks}>
        <Text style={styles.tickLabel}>0</Text>
        <Text style={styles.tickLabel}>25%</Text>
        <Text style={styles.tickLabel}>50%</Text>
        <Text style={styles.tickLabel}>75%</Text>
        <Text style={styles.tickLabel}>100%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 10,
  },
  value: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
  max: {
    ...typography.caption,
    color: colors.textDim,
    fontWeight: "400",
  },
  meterTrack: {
    height: 8,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  meterFill: {
    height: "100%",
    borderRadius: radius.full,
  },
  ticks: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  tickLabel: {
    ...typography.caption,
    fontSize: 9,
    color: colors.textDim,
    fontVariant: ["tabular-nums"],
  },
});
