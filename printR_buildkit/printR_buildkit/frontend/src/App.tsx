import React from "react";
import { useGameMachine } from "./state/useGameMachine";
import { SoundProvider } from "./state/SoundProvider";
import { HomeScreen } from "./screens/HomeScreen";
import { ProgressScreen } from "./screens/ProgressScreen";
import { GovernanceScreen } from "./screens/GovernanceScreen";
import { StoreScreen } from "./screens/StoreScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { VaultScreen } from "./screens/VaultScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { NavBar } from "./components/NavBar";
import { LiveRoundScreen } from "./screens/LiveRoundScreen";
import { ResultScreen } from "./screens/ResultScreen";
import { HapticsProvider } from "./state/HapticsProvider";

export default function App(){
  const game = useGameMachine();

  return (
    <div className="pr-bg">
      <div className="pr-frame">
        <HapticsProvider>
          <SoundProvider>
            {game.state.view === "home" && <HomeScreen game={game} />}
            {game.state.view === "live" && <LiveRoundScreen game={game} />}
            {game.state.view === "result" && <ResultScreen game={game} />}
            {game.state.view === "progress" && <ProgressScreen game={game} />}
            {game.state.view === "store" && <StoreScreen game={game} />}
            {game.state.view === "governance" && <GovernanceScreen game={game} />}
            {game.state.view === "profile" && <ProfileScreen game={game} />}
            {game.state.view === "vault" && <VaultScreen game={game} />}
            {game.state.view === "leaderboard" && <LeaderboardScreen game={game} />}
            {game.state.view === "history" && <HistoryScreen game={game} />}

            <NavBar active={navKey(game.state.view)} onNavigate={(k)=>game.navigate(k)} />
          </SoundProvider>
        </HapticsProvider>
      </div>
    </div>
  );
}


function navKey(view: any){
  if(view === "live" || view === "result") return "home";
  if(view === "vault" || view === "leaderboard" || view === "history") return "progress";
  return view;
}
