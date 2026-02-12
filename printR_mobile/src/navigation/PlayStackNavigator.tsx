import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { PlayStackParamList } from "./types";
import HomeScreen from "../screens/HomeScreen";
import LiveRoundScreen from "../screens/LiveRoundScreen";
import ResultScreen from "../screens/ResultScreen";

const Stack = createNativeStackNavigator<PlayStackParamList>();

export default function PlayStackNavigator() {
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
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LiveRound"
        component={LiveRoundScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Result"
        component={ResultScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
