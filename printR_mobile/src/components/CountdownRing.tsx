import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

interface CountdownRingProps {
  msLeft: number;
}

export function CountdownRing({ msLeft }: CountdownRingProps) {
  const label = useMemo(() => {
    const totalSec = Math.max(0, Math.floor(msLeft / 1000));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }, [msLeft]);

  return (
    <View style={styles.ring}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 54,
    height: 54,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(34,211,238,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
});
