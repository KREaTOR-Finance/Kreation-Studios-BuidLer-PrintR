import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Card } from "../components/Card";
import { TopStats } from "../components/TopStats";
import { WeightedVoteMeter } from "../components/WeightedVoteMeter";
import { ProposalCard } from "../components/ProposalCard";
import { useGame } from "../navigation/GameContext";
import { usePlayerHeaders } from "../hooks/usePlayerHeaders";
import { useCreditsBalance } from "../hooks/useCreditsBalance";

const mockProposals = [
  { id: "1", title: "Extend session duration to 30 min", description: "Community proposal to increase default session length.", forPct: 62, againstPct: 38 },
  { id: "2", title: "Add 10x leverage tier", description: "Introduce ULTRA tier with 10x max leverage for experienced players.", forPct: 45, againstPct: 55 },
];

export function GovernanceScreen() {
  const { state } = useGame();
  const player = usePlayerHeaders();
  const { sessionsBalance } = useCreditsBalance(player);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TopStats points={state.points} streak={state.streak} sessions={sessionsBalance} />

      <Card title="Voting Power" subtitle="Your influence is based on streak and points.">
        <WeightedVoteMeter streak={state.streak} points={state.points} />
      </Card>

      <Card title="Active Proposals" subtitle="Vote on community proposals.">
        {mockProposals.map((p) => (
          <ProposalCard
            key={p.id}
            title={p.title}
            description={p.description}
            forPct={p.forPct}
            againstPct={p.againstPct}
            onVoteFor={() => {}}
            onVoteAgainst={() => {}}
          />
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
});
