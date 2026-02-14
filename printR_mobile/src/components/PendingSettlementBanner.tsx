import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { colors } from "../theme/colors";
import { spacing, radius } from "../theme/spacing";
import { typography } from "../theme/typography";

interface PendingSettlementBannerProps {
  provider: string;
  requestId: string;
}

export const PendingSettlementBanner: React.FC<PendingSettlementBannerProps> = ({
  provider,
  requestId,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <ActivityIndicator size="small" color={colors.stateWarn} />
        <View style={styles.textSection}>
          <Text style={styles.title}>Settlement Pending</Text>
          <Text style={styles.subtitle}>
            Awaiting {provider} VRF result
          </Text>
          <Text style={styles.requestId} numberOfLines={1}>
            Request: {requestId}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  textSection: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    ...typography.heading,
    color: colors.stateWarn,
    fontSize: 14,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  requestId: {
    ...typography.caption,
    color: colors.textDim,
    fontSize: 10,
    marginTop: spacing.xs,
    fontVariant: ["tabular-nums"],
  },
});
