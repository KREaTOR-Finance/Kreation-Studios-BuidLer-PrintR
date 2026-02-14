import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { spacing, radius } from "../theme/spacing";
import { typography } from "../theme/typography";

interface ListRowProps {
  left: string;
  sub?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}

export const ListRow: React.FC<ListRowProps> = ({
  left,
  sub,
  right,
  onPress,
}) => {
  const content = (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Text style={styles.leftText}>{left}</Text>
        {sub ? <Text style={styles.subText}>{sub}</Text> : null}
      </View>
      {right ? <View style={styles.rightSection}>{right}</View> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  leftSection: {
    flex: 1,
    marginRight: spacing.md,
  },
  leftText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  subText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  rightSection: {
    flexShrink: 0,
    alignItems: "flex-end",
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: colors.surfaceCard,
  },
});
