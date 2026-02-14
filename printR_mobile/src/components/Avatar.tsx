import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme/colors";

interface AvatarProps {
  seed: string;
  size?: number;
}

/**
 * Generates a deterministic HSL-based gradient from a seed string.
 * Hashes the seed to produce two hue values for the gradient stops.
 */
function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit int
  }
  return Math.abs(hash);
}

function seedToGradient(seed: string): [string, string] {
  const h = hashSeed(seed);
  const hue1 = h % 360;
  const hue2 = (hue1 + 45 + (h % 90)) % 360;
  return [
    `hsl(${hue1}, 72%, 58%)`,
    `hsl(${hue2}, 68%, 48%)`,
  ];
}

function getInitials(seed: string): string {
  const parts = seed.trim().split(/[\s._-]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return seed.slice(0, 2).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({ seed, size = 40 }) => {
  const gradientColors = useMemo(() => seedToGradient(seed), [seed]);
  const initials = useMemo(() => getInitials(seed), [seed]);
  const fontSize = size * 0.38;

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text
        style={[
          styles.initials,
          { fontSize },
        ]}
      >
        {initials}
      </Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initials: {
    color: colors.textPrimary,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
