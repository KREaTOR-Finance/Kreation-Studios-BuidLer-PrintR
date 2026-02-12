import React, { useRef } from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "../theme/colors";
import { spacing, radius } from "../theme/spacing";
import { typography } from "../theme/typography";

interface ButtonProps {
  variant?: "primary" | "secondary";
  onPress?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  onPress,
  disabled = false,
  children,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const isPrimary = variant === "primary";

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={({ pressed }) => [
          styles.base,
          disabled && styles.disabled,
        ]}
      >
        {isPrimary ? (
          <LinearGradient
            colors={
              disabled
                ? ["rgba(59,130,246,0.4)", "rgba(139,92,246,0.4)"]
                : gradients.primaryBtn
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            <Text
              style={[
                styles.label,
                disabled && styles.labelDisabled,
              ]}
            >
              {children}
            </Text>
          </LinearGradient>
        ) : (
          <Text
            style={[
              styles.label,
              styles.secondaryLabel,
              disabled && styles.labelDisabled,
            ]}
          >
            {children}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  gradient: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
    fontSize: 14,
    letterSpacing: 1.0,
  },
  secondaryLabel: {
    color: colors.textMuted,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  labelDisabled: {
    opacity: 0.6,
  },
});
