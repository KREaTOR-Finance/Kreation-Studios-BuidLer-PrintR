import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "../theme/colors";
import { spacing, radius } from "../theme/spacing";
import { typography } from "../theme/typography";

interface ActiveSession {
  id: string;
  name: string;
}

interface ActiveSessionsBannerProps {
  sessions: ActiveSession[];
  onResume: (sessionId: string) => void;
}

export const ActiveSessionsBanner: React.FC<ActiveSessionsBannerProps> = ({
  sessions,
  onResume,
}) => {
  if (sessions.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.dot} />
        <Text style={styles.title}>
          {sessions.length} Active Session{sessions.length > 1 ? "s" : ""}
        </Text>
      </View>
      {sessions.map((session) => (
        <View key={session.id} style={styles.sessionRow}>
          <Text style={styles.sessionName} numberOfLines={1}>
            {session.name}
          </Text>
          <Pressable
            onPress={() => onResume(session.id)}
            style={({ pressed }) => [
              styles.resumeBtn,
              pressed && styles.resumeBtnPressed,
            ]}
          >
            <LinearGradient
              colors={gradients.primaryBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.resumeGradient}
            >
              <Text style={styles.resumeLabel}>RESUME</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(59,130,246,0.06)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.20)",
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.stateWin,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.label,
    color: colors.textPrimary,
    fontSize: 12,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  sessionName: {
    ...typography.body,
    color: colors.textMuted,
    flex: 1,
    marginRight: spacing.md,
  },
  resumeBtn: {
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  resumeBtnPressed: {
    opacity: 0.8,
  },
  resumeGradient: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  resumeLabel: {
    ...typography.label,
    color: colors.textPrimary,
    fontSize: 10,
  },
});
