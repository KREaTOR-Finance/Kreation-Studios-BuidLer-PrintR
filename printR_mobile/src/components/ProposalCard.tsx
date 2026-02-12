import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "../theme/colors";
import { spacing, radius } from "../theme/spacing";
import { typography } from "../theme/typography";
import { Badge } from "./Badge";

type ProposalStatus = "active" | "passed" | "rejected" | "pending";

interface ProposalCardProps {
  id: string;
  title: string;
  description: string;
  status: ProposalStatus;
  votesFor: number;
  votesAgainst: number;
  endTime?: string;
  onPress?: () => void;
}

const statusToneMap: Record<ProposalStatus, "blue" | "win" | "warn" | "purple"> = {
  active: "blue",
  passed: "win",
  rejected: "warn",
  pending: "purple",
};

export const ProposalCard: React.FC<ProposalCardProps> = ({
  id,
  title,
  description,
  status,
  votesFor,
  votesAgainst,
  endTime,
  onPress,
}) => {
  const totalVotes = votesFor + votesAgainst;
  const forPercent = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 50;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <LinearGradient
        colors={gradients.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.proposalId}>#{id}</Text>
          <Badge
            text={status.toUpperCase()}
            tone={statusToneMap[status]}
          />
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.description} numberOfLines={3}>
          {description}
        </Text>

        {/* Vote bar */}
        <View style={styles.voteBarContainer}>
          <View style={styles.voteLabels}>
            <Text style={styles.voteFor}>
              FOR {Math.round(forPercent)}%
            </Text>
            <Text style={styles.voteAgainst}>
              AGAINST {Math.round(100 - forPercent)}%
            </Text>
          </View>
          <View style={styles.voteTrack}>
            <View
              style={[
                styles.voteFill,
                { width: `${forPercent}%` as unknown as number },
              ]}
            />
          </View>
        </View>

        {endTime ? (
          <Text style={styles.endTime}>
            Ends: {endTime}
          </Text>
        ) : null}
      </LinearGradient>
    </Pressable>
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
  pressed: {
    opacity: 0.85,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  proposalId: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 11,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  voteBarContainer: {
    marginBottom: spacing.sm,
  },
  voteLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  voteFor: {
    ...typography.label,
    fontSize: 10,
    color: colors.stateWin,
  },
  voteAgainst: {
    ...typography.label,
    fontSize: 10,
    color: colors.stateLoss,
  },
  voteTrack: {
    height: 4,
    backgroundColor: "rgba(239,68,68,0.25)",
    borderRadius: radius.full,
    overflow: "hidden",
  },
  voteFill: {
    height: "100%",
    backgroundColor: colors.stateWin,
    borderRadius: radius.full,
  },
  endTime: {
    ...typography.caption,
    color: colors.textDim,
    fontSize: 11,
  },
});
