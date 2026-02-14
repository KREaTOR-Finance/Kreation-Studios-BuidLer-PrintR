import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "../theme/colors";
import { spacing, radius } from "../theme/spacing";
import { typography } from "../theme/typography";
import { Badge } from "./Badge";

interface CreditPackCardProps {
  title: string;
  tokens: number;
  price: string;
  highlight?: boolean;
  badge?: string;
  onBuy: () => void;
}

export const CreditPackCard: React.FC<CreditPackCardProps> = ({
  title,
  tokens,
  price,
  highlight = false,
  badge,
  onBuy,
}) => {
  return (
    <LinearGradient
      colors={
        highlight
          ? gradients.activeTab
          : gradients.card
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        highlight && styles.containerHighlight,
      ]}
    >
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {badge ? (
            <Badge text={badge} tone={highlight ? "purple" : "blue"} />
          ) : null}
        </View>
        <Text style={styles.tokens}>
          {tokens.toLocaleString()} tokens
        </Text>
      </View>
      <View style={styles.buySection}>
        <Text style={styles.price}>{price}</Text>
        <Pressable
          onPress={onBuy}
          style={({ pressed }) => [
            styles.buyButton,
            pressed && styles.buyButtonPressed,
          ]}
        >
          <LinearGradient
            colors={gradients.primaryBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buyGradient}
          >
            <Text style={styles.buyLabel}>BUY</Text>
          </LinearGradient>
        </Pressable>
      </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  containerHighlight: {
    borderColor: "rgba(139,92,246,0.3)",
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 16,
  },
  tokens: {
    ...typography.caption,
    color: colors.textMuted,
  },
  buySection: {
    alignItems: "center",
  },
  price: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  buyButton: {
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  buyButtonPressed: {
    opacity: 0.8,
  },
  buyGradient: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.sm,
  },
  buyLabel: {
    ...typography.label,
    color: colors.textPrimary,
    fontSize: 12,
  },
});
