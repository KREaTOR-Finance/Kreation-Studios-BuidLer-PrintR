import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "../theme/colors";
import { spacing, radius } from "../theme/spacing";
import { typography } from "../theme/typography";

/* ─── Direction Selector ─── */

type Direction = "LONG" | "SHORT";

interface DirectionSelectorProps {
  value: Direction;
  onChange: (direction: Direction) => void;
}

export const DirectionSelector: React.FC<DirectionSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <View style={styles.selectorRow}>
      <Pressable
        onPress={() => onChange("LONG")}
        style={[styles.selectorOption, styles.selectorOptionLeft]}
      >
        {value === "LONG" ? (
          <LinearGradient
            colors={["rgba(34,197,94,0.25)", "rgba(34,197,94,0.10)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.selectorGradient, styles.selectorOptionLeft]}
          >
            <Text style={[styles.selectorLabel, styles.longActive]}>LONG</Text>
          </LinearGradient>
        ) : (
          <View style={styles.selectorInner}>
            <Text style={styles.selectorLabelInactive}>LONG</Text>
          </View>
        )}
      </Pressable>

      <Pressable
        onPress={() => onChange("SHORT")}
        style={[styles.selectorOption, styles.selectorOptionRight]}
      >
        {value === "SHORT" ? (
          <LinearGradient
            colors={["rgba(239,68,68,0.25)", "rgba(239,68,68,0.10)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.selectorGradient, styles.selectorOptionRight]}
          >
            <Text style={[styles.selectorLabel, styles.shortActive]}>SHORT</Text>
          </LinearGradient>
        ) : (
          <View style={styles.selectorInner}>
            <Text style={styles.selectorLabelInactive}>SHORT</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
};

/* ─── Leverage Selector ─── */

interface LeverageSelectorProps {
  options: number[];
  value: number;
  onChange: (leverage: number) => void;
}

export const LeverageSelector: React.FC<LeverageSelectorProps> = ({
  options,
  value,
  onChange,
}) => {
  return (
    <View style={styles.leverageContainer}>
      <Text style={styles.leverageTitle}>LEVERAGE</Text>
      <View style={styles.leverageRow}>
        {options.map((opt) => {
          const isActive = opt === value;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={styles.leverageOption}
            >
              {isActive ? (
                <LinearGradient
                  colors={gradients.activeTab}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.leverageGradient}
                >
                  <Text style={[styles.leverageLabel, styles.leverageLabelActive]}>
                    {opt}x
                  </Text>
                </LinearGradient>
              ) : (
                <View style={styles.leverageInactive}>
                  <Text style={styles.leverageLabel}>{opt}x</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  /* Direction Selector */
  selectorRow: {
    flexDirection: "row",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  selectorOption: {
    flex: 1,
  },
  selectorOptionLeft: {
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
  },
  selectorOptionRight: {
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
  },
  selectorGradient: {
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  selectorInner: {
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceCard,
  },
  selectorLabel: {
    ...typography.label,
    fontSize: 14,
    letterSpacing: 2,
  },
  selectorLabelInactive: {
    ...typography.label,
    fontSize: 14,
    letterSpacing: 2,
    color: colors.textMuted,
  },
  longActive: {
    color: colors.stateWin,
  },
  shortActive: {
    color: colors.stateLoss,
  },

  /* Leverage Selector */
  leverageContainer: {
    marginBottom: spacing.md,
  },
  leverageTitle: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 10,
    marginBottom: spacing.sm,
  },
  leverageRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  leverageOption: {
    flex: 1,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  leverageGradient: {
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.30)",
  },
  leverageInactive: {
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  leverageLabel: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 12,
  },
  leverageLabelActive: {
    color: colors.textPrimary,
  },
});
