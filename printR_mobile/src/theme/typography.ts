import { TextStyle } from "react-native";

export const typography = {
  display: {
    fontWeight: "900",
    letterSpacing: 1.8,
    fontSize: 46,
  } as TextStyle,
  heading: {
    fontWeight: "800",
    letterSpacing: 1.2,
    fontSize: 18,
  } as TextStyle,
  label: {
    fontWeight: "800",
    letterSpacing: 0.8,
    fontSize: 11,
    textTransform: "uppercase",
  } as TextStyle,
  body: {
    fontSize: 14,
    fontWeight: "400",
  } as TextStyle,
  caption: {
    fontSize: 12,
    fontWeight: "400",
  } as TextStyle,
  tabular: {
    fontVariant: ["tabular-nums"] as TextStyle["fontVariant"],
  } as TextStyle,
} as const;
