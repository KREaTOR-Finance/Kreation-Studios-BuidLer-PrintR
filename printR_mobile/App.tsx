import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { SoundProvider } from "./src/state/SoundProvider";
import { HapticsProvider } from "./src/state/HapticsProvider";
import { GameContext } from "./src/navigation/GameContext";
import { useGameMachine } from "./src/state/useGameMachine";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  const game = useGameMachine();

  return (
    <SafeAreaProvider>
      <SoundProvider>
        <HapticsProvider>
          <GameContext.Provider value={game}>
            <NavigationContainer>
              <StatusBar style="light" backgroundColor="#0B1020" />
              <AppNavigator />
            </NavigationContainer>
          </GameContext.Provider>
        </HapticsProvider>
      </SoundProvider>
    </SafeAreaProvider>
  );
}
