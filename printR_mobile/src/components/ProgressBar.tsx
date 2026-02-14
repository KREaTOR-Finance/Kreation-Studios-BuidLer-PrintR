import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "../theme/colors";
import { spacing, radius } from "../theme/spacing";
import { typography } from "../theme/typography";

interface ProgressBarProps {
  value: number; // 0 to 1
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, label }) => {
  const clamped = Math.max(0, Math.min(1, value));
  const percentage = Math.round(clamped * 100);

  return (
    <View style={styles.container}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.percentage}>{percentage}%</Text>
        </View>
      ) : null}
      <View style={styles.track}>
        <LinearGradient
          colors={gradients.primaryBtn}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.fill,
            { width: `${percentage}%` as unknown as number },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
  },
  percentage: {
    ...typography.caption,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  track: {
    height: 6,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.full,
  },
});
