import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { SoundProvider } from "./src/state/SoundProvider";
import { HapticsProvider } from "./src/state/HapticsProvider";
import { WalletProvider, useWallet } from "./src/state/WalletProvider";
import { GameContext } from "./src/navigation/GameContext";
import { useGameMachine } from "./src/state/useGameMachine";
import { setWalletPubkey } from "./src/state/player";
import AppNavigator from "./src/navigation/AppNavigator";

/** Syncs wallet pubkey to the player module so API calls include the wallet. */
function WalletSync({ children }: { children: React.ReactNode }) {
  const { publicKeyStr } = useWallet();

  useEffect(() => {
    setWalletPubkey(publicKeyStr ?? null);
  }, [publicKeyStr]);

  return <>{children}</>;
}

export default function App() {
  const game = useGameMachine();

  return (
    <SafeAreaProvider>
      <SoundProvider>
        <HapticsProvider>
          <WalletProvider>
            <WalletSync>
              <GameContext.Provider value={game}>
                <NavigationContainer>
                  <StatusBar style="light" backgroundColor="#0B1020" />
                  <AppNavigator />
                </NavigationContainer>
              </GameContext.Provider>
            </WalletSync>
          </WalletProvider>
        </HapticsProvider>
      </SoundProvider>
    </SafeAreaProvider>
  );
}
