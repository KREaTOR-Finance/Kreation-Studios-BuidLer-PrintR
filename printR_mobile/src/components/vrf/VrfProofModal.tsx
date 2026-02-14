import React from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import { colors } from "../../theme/colors";
import { spacing, radius } from "../../theme/spacing";
import { typography } from "../../theme/typography";

interface VrfData {
  proof: string;
  seed: string;
  output: string;
  provider: string;
  blockHash?: string;
  requestId?: string;
  timestamp?: string;
}

interface VrfProofModalProps {
  visible: boolean;
  onClose: () => void;
  vrf: VrfData;
}

export const VrfProofModal: React.FC<VrfProofModalProps> = ({
  visible,
  onClose,
  vrf,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>VRF Proof Details</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>X</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
          >
            <ProofField label="PROVIDER" value={vrf.provider} />
            <ProofField label="SEED" value={vrf.seed} mono />
            <ProofField label="OUTPUT" value={vrf.output} mono />
            <ProofField label="PROOF" value={vrf.proof} mono />
            {vrf.blockHash ? (
              <ProofField label="BLOCK HASH" value={vrf.blockHash} mono />
            ) : null}
            {vrf.requestId ? (
              <ProofField label="REQUEST ID" value={vrf.requestId} mono />
            ) : null}
            {vrf.timestamp ? (
              <ProofField label="TIMESTAMP" value={vrf.timestamp} />
            ) : null}
          </ScrollView>

          {/* Verification note */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              This VRF proof can be independently verified on-chain to confirm
              the randomness was generated fairly and was not tampered with.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* ─── Field sub-component ─── */

interface ProofFieldProps {
  label: string;
  value: string;
  mono?: boolean;
}

const ProofField: React.FC<ProofFieldProps> = ({ label, value, mono }) => {
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={fieldStyles.valueBox}>
        <Text
          style={[fieldStyles.value, mono && fieldStyles.mono]}
          selectable
          numberOfLines={4}
        >
          {value}
        </Text>
      </View>
    </View>
  );
};

/* ─── Styles ─── */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.70)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modal: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: colors.bgMidnight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  title: {
    ...typography.heading,
    color: colors.accentTeal,
    fontSize: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceCard,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 12,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  footerText: {
    ...typography.caption,
    color: colors.textDim,
    lineHeight: 18,
    textAlign: "center",
  },
});

const fieldStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 9,
    marginBottom: spacing.xs,
  },
  valueBox: {
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 20,
  },
  mono: {
    fontFamily: "monospace",
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
