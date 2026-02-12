import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "../theme/colors";
import { spacing, radius } from "../theme/spacing";
import { typography } from "../theme/typography";
import { ProgressBar } from "./ProgressBar";

interface ObjectiveCardProps {
  title: string;
  description: string;
  progress: number; // 0 to 1
  done?: boolean;
}

export const ObjectiveCard: React.FC<ObjectiveCardProps> = ({
  title,
  description,
  progress,
  done = false,
}) => {
  return (
    <LinearGradient
      colors={gradients.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, done && styles.containerDone]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, done && styles.titleDone]}>{title}</Text>
          {done ? (
            <View style={styles.doneBadge}>
              <Text style={styles.doneText}>DONE</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.description}>{description}</Text>
      </View>
      <ProgressBar value={progress} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  containerDone: {
    borderColor: "rgba(34,197,94,0.25)",
  },
  header: {
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 15,
    flex: 1,
  },
  titleDone: {
    color: colors.stateWin,
  },
  description: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  doneBadge: {
    backgroundColor: "rgba(34,197,94,0.18)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginLeft: spacing.sm,
  },
  doneText: {
    ...typography.label,
    fontSize: 9,
    color: colors.stateWin,
  },
});
