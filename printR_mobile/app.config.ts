import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "PRINTR",
  slug: "printr",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  scheme: "printr",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#0B1020",
  },
  android: {
    package: "com.kreationstudios.printr",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0B1020",
    },
    versionCode: 1,
  },
  ios: {
    bundleIdentifier: "com.kreationstudios.printr",
    supportsTablet: false,
  },
  plugins: [
    "expo-av",
  ],
  extra: {
    apiBase:
      process.env.PRINTR_API_BASE ||
      "https://kreation-studios-buidler-printr.onrender.com",
    vrfMode: process.env.PRINTR_VRF_MODE || "ONCHAIN",
    sessionFlow: process.env.PRINTR_SESSION_FLOW || "SESSION",
    eas: {
      projectId: "printr-kreation-studios",
    },
  },
});
