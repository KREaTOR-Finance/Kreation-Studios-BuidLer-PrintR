import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

interface CountdownRingProps {
  /** Remaining time in seconds */
  remaining: number;
  /** Total time in seconds (for progress calculation) */
  total: number;
  /** Size of the ring in pixels */
  size?: number;
  /** Stroke width of the ring */
  strokeWidth?: number;
}

export const CountdownRing: React.FC<CountdownRingProps> = ({
  remaining,
  total,
  size = 120,
  strokeWidth = 4,
}) => {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  const timeString = useMemo(() => {
    const clamped = Math.max(0, Math.floor(remaining));
    const mm = String(Math.floor(clamped / 60)).padStart(2, "0");
    const ss = String(clamped % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [remaining]);

  const isUrgent = remaining <= 10;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.borderDefault}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={isUrgent ? colors.stateLoss : colors.primaryBlue}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.labelContainer}>
        <Text
          style={[
            styles.time,
            isUrgent && styles.timeUrgent,
          ]}
        >
          {timeString}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  labelContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  time: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 22,
    fontVariant: ["tabular-nums"],
    letterSpacing: 2,
  },
  timeUrgent: {
    color: colors.stateLoss,
  },
});
