import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useGame } from "../navigation/GameContext";
import { usePlayerHeaders } from "../hooks/usePlayerHeaders";
import { useCreditsBalance } from "../hooks/useCreditsBalance";
import { API_BASE, apiPost } from "../network/httpClient";
import { TopStats } from "../components/TopStats";
import { Card } from "../components/Card";
import { CreditPackCard } from "../components/CreditPackCard";
import { Button } from "../components/Button";
import { colors } from "../theme/colors";
import { spacing, radius } from "../theme/spacing";
import { typography } from "../theme/typography";

type CheckoutResponse = {
  url: string;
};

export default function StoreScreen() {
  const game = useGame();
  const { state } = game;
  const playerHeaders = usePlayerHeaders();
  const { sessionsBalance, refresh: refreshBalance, loading: balanceLoading } = useCreditsBalance(playerHeaders);

  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshBalance();
    setRefreshing(false);
  }, [refreshBalance]);

  const handleBuy = useCallback(
    async (pack: "starter" | "pro") => {
      if (!playerHeaders || purchasing) return;
      setPurchasing(pack);
      try {
        const data = await apiPost<CheckoutResponse>(
          "/api/credits/checkout",
          { pack },
          playerHeaders
        );
        if (data?.url) {
          await Linking.openURL(data.url);
        } else {
          Alert.alert("Error", "No checkout URL returned.");
        }
      } catch (err: any) {
        Alert.alert("Purchase Error", err?.message || "Unable to start checkout.");
      } finally {
        setPurchasing(null);
      }
    },
    [playerHeaders, purchasing]
  );

  const handleResetPoints = useCallback(async () => {
    if (!playerHeaders || resetting) return;

    Alert.alert(
      "Reset Points",
      "Are you sure you want to reset your points to zero? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            setResetting(true);
            try {
              await apiPost("/api/profile/reset-points", {}, playerHeaders);
              Alert.alert("Done", "Your points have been reset.");
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Unable to reset points.");
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  }, [playerHeaders, resetting]);

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

      {/* Current Balance */}
      <Card>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>SESSION BALANCE</Text>
          <Text style={styles.balanceValue}>
            {sessionsBalance != null ? sessionsBalance.toLocaleString() : "--"}
          </Text>
        </View>
      </Card>

      {/* Credit Packs */}
      <Text style={styles.sectionTitle}>PURCHASE SESSIONS</Text>

      <CreditPackCard
        title="Starter Pack"
        tokens={40}
        price="$10"
        onBuy={() => handleBuy("starter")}
        badge="POPULAR"
      />

      {purchasing === "starter" ? (
        <ActivityIndicator color={colors.primaryBlue} style={{ marginBottom: spacing.md }} />
      ) : null}

      <CreditPackCard
        title="Pro Pack"
        tokens={500}
        price="$100"
        highlight
        badge="BEST VALUE"
        onBuy={() => handleBuy("pro")}
      />

      {purchasing === "pro" ? (
        <ActivityIndicator color={colors.primaryPurple} style={{ marginBottom: spacing.md }} />
      ) : null}

      {/* Info text */}
      <Card>
        <Text style={styles.infoText}>
          Sessions are non-transferable arcade credits used to join live trading sessions.
          Each session join costs 1 session credit. Unused credits do not expire.
        </Text>
      </Card>

      {/* Reset Points */}
      <Text style={styles.sectionTitle}>DANGER ZONE</Text>

      <Card>
        <View style={styles.resetRow}>
          <View style={styles.resetInfo}>
            <Text style={styles.resetTitle}>Reset Points</Text>
            <Text style={styles.resetDesc}>
              Start fresh. Resets your points to zero. Streak is preserved.
            </Text>
          </View>
          <Pressable
            style={[styles.resetBtn, resetting && { opacity: 0.5 }]}
            onPress={handleResetPoints}
            disabled={resetting}
          >
            <Text style={styles.resetBtnText}>
              {resetting ? "..." : "RESET"}
            </Text>
          </Pressable>
        </View>
      </Card>

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

  // Balance
  balanceRow: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  balanceLabel: {
    ...typography.label,
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  balanceValue: {
    ...typography.display,
    fontSize: 36,
    color: colors.accentTeal,
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

  // Info
  infoText: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 22,
  },

  // Reset
  resetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resetInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  resetTitle: {
    ...typography.heading,
    fontSize: 14,
    color: colors.stateLoss,
    marginBottom: spacing.xs,
  },
  resetDesc: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  resetBtn: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  resetBtnText: {
    ...typography.label,
    fontSize: 11,
    color: colors.stateLoss,
  },
});
