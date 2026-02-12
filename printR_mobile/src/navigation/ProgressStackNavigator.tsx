import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { ProgressStackParamList } from "./types";
import ProgressScreen from "../screens/ProgressScreen";
import VaultScreen from "../screens/VaultScreen";
import LeaderboardScreen from "../screens/LeaderboardScreen";
import HistoryScreen from "../screens/HistoryScreen";

const Stack = createNativeStackNavigator<ProgressStackParamList>();

export default function ProgressStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTransparent: true,
        headerStyle: { backgroundColor: "#0B1020" },
        headerTintColor: "#F1F5F9",
        headerTitle: "",
        contentStyle: { backgroundColor: "#0B1020" },
      }}
    >
      <Stack.Screen
        name="Progress"
        component={ProgressScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Vault"
        component={VaultScreen}
        options={{ title: "Vault" }}
      />
      <Stack.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{ title: "Leaderboard" }}
      />
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: "History" }}
      />
    </Stack.Navigator>
  );
}
