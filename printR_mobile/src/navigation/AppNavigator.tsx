import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";
import MainTabNavigator from "./MainTabNavigator";
import VrfProofModalScreen from "../screens/VrfProofModalScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen
        name="VrfProofModal"
        component={VrfProofModalScreen}
        options={{
          presentation: "modal",
          headerShown: true,
          headerTransparent: true,
          headerStyle: { backgroundColor: "#0B1020" },
          headerTintColor: "#F1F5F9",
          title: "VRF Proof",
          contentStyle: { backgroundColor: "#0B1020" },
        }}
      />
    </Stack.Navigator>
  );
}
