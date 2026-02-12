import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { spacing, radius } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { VrfProofModal } from "./VrfProofModal";

interface VrfData {
  proof: string;
  seed: string;
  output: string;
  provider: string;
  blockHash?: string;
  requestId?: string;
  timestamp?: string;
}

interface VrfProofBadgeProps {
  vrf?: VrfData | null;
}

export const VrfProofBadge: React.FC<VrfProofBadgeProps> = ({ vrf }) => {
  const [modalVisible, setModalVisible] = useState(false);

  if (!vrf) {
    return (
      <View style={styles.badgeInactive}>
        <Text style={styles.badgeIcon}>?</Text>
        <Text style={styles.badgeLabelInactive}>NO VRF</Text>
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        style={({ pressed }) => [
          styles.badge,
          pressed && styles.badgePressed,
        ]}
      >
        <Text style={styles.badgeIcon}>i</Text>
        <Text style={styles.badgeLabel}>VRF PROOF</Text>
      </Pressable>

      <VrfProofModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        vrf={vrf}
      />
    </>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34,211,238,0.12)",
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.25)",
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  badgePressed: {
    opacity: 0.75,
  },
  badgeInactive: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    opacity: 0.5,
  },
  badgeIcon: {
    ...typography.label,
    color: colors.accentTeal,
    fontSize: 11,
    width: 16,
    height: 16,
    textAlign: "center",
    lineHeight: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accentTeal,
    overflow: "hidden",
  },
  badgeLabel: {
    ...typography.label,
    color: colors.accentTeal,
    fontSize: 9,
  },
  badgeLabelInactive: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 9,
  },
});
