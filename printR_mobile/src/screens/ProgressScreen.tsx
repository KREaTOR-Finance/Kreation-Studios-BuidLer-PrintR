import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ProgressStackParamList } from "../navigation/types";
import { useGame } from "../navigation/GameContext";
import { usePlayerHeaders } from "../hooks/usePlayerHeaders";
import { useCreditsBalance } from "../hooks/useCreditsBalance";
import { apiGet } from "../network/httpClient";
import { TopStats } from "../components/TopStats";
import { Card } from "../components/Card";
import { ProgressBar } from "../components/ProgressBar";
import { ObjectiveCard } from "../components/ObjectiveCard";
import { Button } from "../components/Button";
import { colors } from "../theme/colors";
import { spacing, radius } from "../theme/spacing";
import { typography } from "../theme/typography";

type Nav = NativeStackNavigationProp<ProgressStackParamList, "Progress">;

type ProgressData = {
  level: number;
  xp: number;
  xpToNext: number;
  totalRounds: number;
  safeWins: number;
  boldWins: number;
  dailyRounds: number;
  dailyTarget: number;
};

export default function ProgressScreen() {
  const game = useGame();
  const { state } = game;
  const nav = useNavigation<Nav>();
  const playerHeaders = usePlayerHeaders();
  const { sessionsBalance } = useCreditsBalance(playerHeaders);

  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProgress = useCallback(async () => {
    if (!playerHeaders) return;
    try {
      const data = await apiGet<ProgressData>("/api/progress", playerHeaders);
      if (data && typeof data.level === "number") {
        setProgress(data);
      }
    } catch {
      // Use defaults
    }
  }, [playerHeaders]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProgress();
    setRefreshing(false);
  }, [fetchProgress]);

  // Derived values
  const level = progress?.level ?? 1;
  const xp = progress?.xp ?? 0;
  const xpToNext = progress?.xpToNext ?? 1000;
  const xpProgress = xpToNext > 0 ? xp / xpToNext : 0;
  const safeWins = progress?.safeWins ?? 0;
  const boldWins = progress?.boldWins ?? 0;
  const dailyRounds = progress?.dailyRounds ?? 0;
  const dailyTarget = progress?.dailyTarget ?? 10;

  // Objective calculations
  const safeTarget = 10;
  const boldTarget = 5;
  const safeProgress = Math.min(1, safeWins / safeTarget);
  const boldProgress = Math.min(1, boldWins / boldTarget);
  const dailyProgress = dailyTarget > 0 ? Math.min(1, dailyRounds / dailyTarget) : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primaryBlue}
          colors={[colors.primaryBlue]}
        />
      }
    >
      {/* Top Stats Bar */}
      <TopStats
        points={state.points}
        streak={state.streak}
        sessions={sessionsBalance}
      />

      {/* Level Card */}
      <Card title="Player Level">
        <View style={styles.levelRow}>
          <Text style={styles.levelNumber}>Lv. {level}</Text>
          <Text style={styles.xpText}>
            {xp.toLocaleString()} / {xpToNext.toLocaleString()} XP
          </Text>
        </View>
        <ProgressBar value={xpProgress} label="Level Progress" />
      </Card>

      {/* Objectives */}
      <Text style={styles.sectionTitle}>DAILY OBJECTIVES</Text>

      <ObjectiveCard
        title="SAFE Wins"
        description={`Win ${safeTarget} rounds on SAFE tier. Steady hands build consistency.`}
        progress={safeProgress}
        done={safeWins >= safeTarget}
      />

      <ObjectiveCard
        title="Try BOLD"
        description={`Win ${boldTarget} rounds on BOLD tier. Push beyond comfort for bigger rewards.`}
        progress={boldProgress}
        done={boldWins >= boldTarget}
      />

      <ObjectiveCard
        title="Daily Rounds"
        description={`Complete ${dailyTarget} rounds today. Stay active, stay sharp.`}
        progress={dailyProgress}
        done={dailyRounds >= dailyTarget}
      />

      {/* Quick Navigation */}
      <Text style={styles.sectionTitle}>EXPLORE</Text>

      <View style={styles.navGrid}>
        <Pressable
          style={styles.navCard}
          onPress={() => nav.navigate("Vault")}
        >
          <Text style={styles.navIcon}>V</Text>
          <Text style={styles.navLabel}>VAULT</Text>
          <Text style={styles.navDesc}>Claim prizes</Text>
        </Pressable>

        <Pressable
          style={styles.navCard}
          onPress={() => nav.navigate("Leaderboard")}
        >
          <Text style={styles.navIcon}>L</Text>
          <Text style={styles.navLabel}>LEADERBOARD</Text>
          <Text style={styles.navDesc}>Weekly rankings</Text>
        </Pressable>

        <Pressable
          style={styles.navCard}
          onPress={() => nav.navigate("History")}
        >
          <Text style={styles.navIcon}>H</Text>
          <Text style={styles.navLabel}>HISTORY</Text>
          <Text style={styles.navDesc}>Session scores</Text>
        </Pressable>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    padding: spacing.lg,
    paddingTop: 56,
  },

  // Level
  levelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  levelNumber: {
    ...typography.heading,
    fontSize: 28,
    color: colors.primaryBlue,
  },
  xpText: {
    ...typography.caption,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },

  // Section
  sectionTitle: {
    ...typography.label,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },

  // Nav grid
  navGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  navCard: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
    alignItems: "center",
  },
  navIcon: {
    ...typography.heading,
    fontSize: 22,
    color: colors.primaryBlue,
    marginBottom: spacing.sm,
  },
  navLabel: {
    ...typography.label,
    fontSize: 9,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  navDesc: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: "center",
  },
});
