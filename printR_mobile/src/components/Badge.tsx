import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { spacing, radius } from "../theme/spacing";
import { typography } from "../theme/typography";

type Tone = "blue" | "purple" | "teal" | "win" | "warn";

interface BadgeProps {
  text: string;
  tone?: Tone;
}

const toneMap: Record<Tone, { bg: string; text: string }> = {
  blue: {
    bg: "rgba(59,130,246,0.18)",
    text: colors.primaryBlue,
  },
  purple: {
    bg: "rgba(139,92,246,0.18)",
    text: colors.primaryPurple,
  },
  teal: {
    bg: "rgba(34,211,238,0.18)",
    text: colors.accentTeal,
  },
  win: {
    bg: "rgba(34,197,94,0.18)",
    text: colors.stateWin,
  },
  warn: {
    bg: "rgba(245,158,11,0.18)",
    text: colors.stateWarn,
  },
};

export const Badge: React.FC<BadgeProps> = ({ text, tone = "blue" }) => {
  const scheme = toneMap[tone];

  return (
    <View style={[styles.container, { backgroundColor: scheme.bg }]}>
      <Text style={[styles.text, { color: scheme.text }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignSelf: "flex-start",
  },
  text: {
    ...typography.label,
    fontSize: 10,
    letterSpacing: 0.8,
  },
});
