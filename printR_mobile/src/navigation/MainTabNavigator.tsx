import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { MainTabParamList } from "./types";
import PlayStackNavigator from "./PlayStackNavigator";
import ProgressStackNavigator from "./ProgressStackNavigator";
import StoreScreen from "../screens/StoreScreen";
import { GovernanceScreen } from "../screens/GovernanceScreen";
import { ProfileScreen } from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabIconProps = { emoji: string; focused: boolean };

function TabIcon({ emoji, focused }: TabIconProps) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "rgba(11,16,32,0.95)",
          borderTopColor: "rgba(255,255,255,0.10)",
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: "#3B82F6",
        tabBarInactiveTintColor: "rgba(241,245,249,0.5)",
      }}
    >
      <Tab.Screen
        name="PlayTab"
        component={PlayStackNavigator}
        options={{
          tabBarLabel: "Play",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={"\u26A1"} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="ProgressTab"
        component={ProgressStackNavigator}
        options={{
          tabBarLabel: "Progress",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={"\uD83C\uDFC6"} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Store"
        component={StoreScreen}
        options={{
          tabBarLabel: "Store",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={"\uD83D\uDED2"} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Governance"
        component={GovernanceScreen}
        options={{
          tabBarLabel: "Govern",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={"\uD83D\uDDF3\uFE0F"} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={"\uD83D\uDC64"} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
