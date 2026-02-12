import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PlayStackParamList } from "../navigation/types";
import { useGame } from "../navigation/GameContext";
import { usePlayerHeaders } from "../hooks/usePlayerHeaders";
import { useCreditsBalance } from "../hooks/useCreditsBalance";
import { useSessionFeed } from "../hooks/useSessionFeed";
import { WsClient, getWsPlayerId } from "../network/wsClient";
import { API_BASE, apiPost } from "../network/httpClient";
import { TopStats } from "../components/TopStats";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import TradingViewLikeChart from "../components/charts/TradingViewLikeChart";
import { colors, glows } from "../theme/colors";
import { spacing, radius } from "../theme/spacing";
import { typography } from "../theme/typography";
import type { Direction, RiskTier } from "../state/machine";

type RouteType = RouteProp<PlayStackParamList, "LiveRound">;
type Nav = NativeStackNavigationProp<PlayStackParamList, "LiveRound">;

function toWsUrl(httpBase: string): string {
  return httpBase.replace(/^http/, "ws") + "/ws";
}

const DIRECTIONS: Direction[] = ["UP", "DOWN"];
const TIERS: RiskTier[] = ["SAFE", "BOLD", "LEGEND"];
const COMMIT_AMOUNTS = [100, 250, 500, 750, 1000];

export default function LiveRoundScreen() {
  const route = useRoute<RouteType>();
  const nav = useNavigation<Nav>();
  const game = useGame();
  const { state, dispatch } = game;
  const playerHeaders = usePlayerHeaders();
  const { sessionsBalance } = useCreditsBalance(playerHeaders);

  const sessionId = route.params?.sessionId ?? state.join?.sessionId ?? null;
  const isSpectating = state.join?.mode === "spectate";

  // WS connection
  const wsRef = useRef<WsClient | null>(null);
  const [wsReady, setWsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ws = new WsClient();
    wsRef.current = ws;

    (async () => {
      const playerId = await getWsPlayerId();
      if (cancelled) return;
      const wsUrl = toWsUrl(API_BASE);
      ws.connect(`${wsUrl}?playerId=${playerId}${sessionId ? `&sessionId=${sessionId}` : ""}`);
      setWsReady(true);

      // Subscribe to session
      if (sessionId) {
        ws.send({ type: "SUBSCRIBE", sessionId });
      }
    })();

    return () => {
      cancelled = true;
      ws.close();
      wsRef.current = null;
      setWsReady(false);
    };
  }, [sessionId]);

  const { ticks, hud, lastVrf, sessionState } = useSessionFeed(wsRef.current, sessionId);

  // Local selection state
  const [selectedDirection, setSelectedDirection] = useState<Direction>(state.selection.direction);
  const [selectedTier, setSelectedTier] = useState<RiskTier>(state.selection.tier);
  const [commitAmount, setCommitAmount] = useState(250);
  const [committing, setCommitting] = useState(false);
  const [closing, setClosing] = useState(false);

  // Derived data
  const phase = sessionState?.phase ?? state.join?.phase ?? "LIVE";
  const price = sessionState?.price ?? ticks[ticks.length - 1]?.price ?? null;
  const tickIndex = sessionState?.tickIndex ?? ticks[ticks.length - 1]?.tickIndex ?? 0;
  const timeRemainingMs = sessionState?.timeRemainingMs ?? null;
  const closingRemainingMs = sessionState?.closingRemainingMs ?? null;
  const assetName = sessionState?.assetName ?? "BTC/USD";

  // HUD data
  const scoreDisplay = hud?.scoreDisplay ?? 0;
  const markersRemaining = hud?.markersRemaining ?? 0;
  const hasOpen = hud?.hasOpen ?? false;
  const openPosition = hud?.openPosition ?? null;

  // Countdown display
  const formatCountdown = (ms: number | null) => {
    if (ms == null || ms <= 0) return "--:--";
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  // Commit handler
  const handleCommit = useCallback(async () => {
    if (!playerHeaders || !sessionId || isSpectating || committing) return;
    setCommitting(true);
    try {
      await apiPost(
        `/api/sessions/${sessionId}/commit`,
        {
          direction: selectedDirection,
          tier: selectedTier,
          amount: commitAmount,
        },
        playerHeaders
      );
      dispatch({ type: "SET_DIRECTION", direction: selectedDirection });
      dispatch({ type: "SET_TIER", tier: selectedTier });
    } catch (err: any) {
      Alert.alert("Commit Failed", err?.message || "Unable to place position.");
    } finally {
      setCommitting(false);
    }
  }, [playerHeaders, sessionId, isSpectating, committing, selectedDirection, selectedTier, commitAmount, dispatch]);

  // Close handler
  const handleClose = useCallback(async () => {
    if (!playerHeaders || !sessionId || isSpectating || closing || !hasOpen) return;
    setClosing(true);
    try {
      await apiPost(
        `/api/sessions/${sessionId}/close`,
        {},
        playerHeaders
      );
    } catch (err: any) {
      Alert.alert("Close Failed", err?.message || "Unable to close position.");
    } finally {
      setClosing(false);
    }
  }, [playerHeaders, sessionId, isSpectating, closing, hasOpen]);

  // Phase status text
  const phaseStatusText = useMemo(() => {
    switch (phase) {
      case "LIVE":
        return "Session is LIVE. Place your positions.";
      case "FINAL_COMMIT_WARNING":
        return "Final commit window! Last chance to enter.";
      case "CLOSING":
        return "Session is closing. No new positions.";
      case "ENDED":
        return "Session has ended.";
      default:
        return phase;
    }
  }, [phase]);

  const canCommit = phase === "LIVE" || phase === "FINAL_COMMIT_WARNING";
  const isPending = state.pending != null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Top Stats Bar */}
      <TopStats
        points={state.points}
        streak={state.streak}
        sessions={sessionsBalance}
      />

      {/* Spectator Banner */}
      {isSpectating ? (
        <View style={styles.spectatorBanner}>
          <Text style={styles.spectatorText}>SPECTATING</Text>
        </View>
      ) : null}

      {/* Main Session Card */}
      <Card>
        <View style={styles.mainHeader}>
          <View style={styles.mainHeaderLeft}>
            <Text style={styles.assetLabel}>{assetName}</Text>
            <Badge text={phase} tone={phase === "LIVE" ? "win" : phase === "FINAL_COMMIT_WARNING" ? "warn" : "purple"} />
          </View>
          {lastVrf?.requestId ? (
            <Badge text="VRF" tone="teal" />
          ) : null}
        </View>

        {/* Price display */}
        <Text style={styles.priceDisplay}>
          {price != null
            ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "Loading..."}
        </Text>

        {/* Countdown */}
        <View style={styles.countdownRow}>
          {timeRemainingMs != null ? (
            <View style={styles.countdownItem}>
              <Text style={styles.countdownLabel}>ENDS IN</Text>
              <Text style={styles.countdownValue}>{formatCountdown(timeRemainingMs)}</Text>
            </View>
          ) : null}
          {closingRemainingMs != null ? (
            <View style={styles.countdownItem}>
              <Text style={styles.countdownLabel}>CLOSING IN</Text>
              <Text style={styles.countdownValue}>{formatCountdown(closingRemainingMs)}</Text>
            </View>
          ) : null}
          <View style={styles.countdownItem}>
            <Text style={styles.countdownLabel}>TICK</Text>
            <Text style={styles.countdownValue}>{tickIndex}</Text>
          </View>
        </View>
      </Card>

      {/* Chart */}
      <Card>
        <TradingViewLikeChart data={ticks} height={240} />
      </Card>

      {/* Pending Settlement Banner */}
      {isPending ? (
        <View style={styles.pendingBanner}>
          <ActivityIndicator size="small" color={colors.stateWarn} />
          <Text style={styles.pendingText}>Settlement pending (VRF {state.pending!.provider})...</Text>
        </View>
      ) : null}

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>SCORE</Text>
          <Text style={styles.statValue}>{scoreDisplay.toLocaleString()}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>MARKERS</Text>
          <Text style={styles.statValue}>{markersRemaining}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>STATUS</Text>
          <Text style={[styles.statValue, { color: hasOpen ? colors.stateWin : colors.textMuted }]}>
            {hasOpen ? "OPEN" : "IDLE"}
          </Text>
        </View>
      </View>

      {/* Open position info */}
      {openPosition ? (
        <Card>
          <View style={styles.openPosRow}>
            <Text style={styles.openPosLabel}>Open Position</Text>
            <Badge
              text={openPosition.direction ?? "---"}
              tone={openPosition.direction === "UP" ? "win" : "warn"}
            />
            <Text style={styles.openPosDetail}>
              Entry: ${openPosition.entryPrice?.toFixed(2) ?? "--"}
            </Text>
            <Text style={styles.openPosDetail}>
              Size: {openPosition.amount ?? "--"}
            </Text>
          </View>
        </Card>
      ) : null}

      {/* Trading Controls (only if playing, not spectating) */}
      {!isSpectating ? (
        <Card title="Trade">
          {/* Direction Selector */}
          <Text style={styles.selectorLabel}>DIRECTION</Text>
          <View style={styles.selectorRow}>
            {DIRECTIONS.map((dir) => (
              <Pressable
                key={dir}
                style={[
                  styles.selectorBtn,
                  selectedDirection === dir && (dir === "UP" ? styles.selectorBtnLong : styles.selectorBtnShort),
                ]}
                onPress={() => setSelectedDirection(dir)}
              >
                <Text
                  style={[
                    styles.selectorBtnText,
                    selectedDirection === dir && styles.selectorBtnTextActive,
                  ]}
                >
                  {dir === "UP" ? "LONG" : "SHORT"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Tier Selector */}
          <Text style={styles.selectorLabel}>TIER</Text>
          <View style={styles.selectorRow}>
            {TIERS.map((tier) => (
              <Pressable
                key={tier}
                style={[
                  styles.selectorBtn,
                  selectedTier === tier && styles.selectorBtnActive,
                ]}
                onPress={() => setSelectedTier(tier)}
              >
                <Text
                  style={[
                    styles.selectorBtnText,
                    selectedTier === tier && styles.selectorBtnTextActive,
                  ]}
                >
                  {tier}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Commit Amount Selector */}
          <Text style={styles.selectorLabel}>AMOUNT</Text>
          <View style={styles.selectorRow}>
            {COMMIT_AMOUNTS.map((amt) => (
              <Pressable
                key={amt}
                style={[
                  styles.amountBtn,
                  commitAmount === amt && styles.amountBtnActive,
                ]}
                onPress={() => setCommitAmount(amt)}
              >
                <Text
                  style={[
                    styles.amountBtnText,
                    commitAmount === amt && styles.amountBtnTextActive,
                  ]}
                >
                  {amt}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Button
              onPress={handleCommit}
              disabled={!canCommit || committing}
              style={{ flex: 1 }}
            >
              {committing ? "COMMITTING..." : "COMMIT"}
            </Button>
            {hasOpen ? (
              <Button
                variant="secondary"
                onPress={handleClose}
                disabled={closing}
                style={{ flex: 1 }}
              >
                {closing ? "CLOSING..." : "CLOSE"}
              </Button>
            ) : null}
          </View>
        </Card>
      ) : null}

      {/* Phase Status */}
      <View style={styles.phaseStatusRow}>
        <Text style={styles.phaseStatusText}>{phaseStatusText}</Text>
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

  // Spectator banner
  spectatorBanner: {
    backgroundColor: "rgba(139,92,246,0.18)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.3)",
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  spectatorText: {
    ...typography.label,
    color: colors.primaryPurple,
    fontSize: 12,
  },

  // Main card header
  mainHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  mainHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  assetLabel: {
    ...typography.heading,
    color: colors.textPrimary,
  },

  // Price
  priceDisplay: {
    ...typography.display,
    fontSize: 32,
    color: colors.accentTeal,
    fontVariant: ["tabular-nums"],
    marginBottom: spacing.md,
  },

  // Countdown
  countdownRow: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  countdownItem: {
    alignItems: "center",
  },
  countdownLabel: {
    ...typography.label,
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: 2,
  },
  countdownValue: {
    ...typography.heading,
    fontSize: 16,
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },

  // Pending banner
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  pendingText: {
    ...typography.caption,
    color: colors.stateWarn,
  },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
  },
  statLabel: {
    ...typography.label,
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.heading,
    fontSize: 16,
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },

  // Open position
  openPosRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  openPosLabel: {
    ...typography.label,
    fontSize: 11,
    color: colors.textMuted,
  },
  openPosDetail: {
    ...typography.caption,
    color: colors.textDim,
    fontVariant: ["tabular-nums"],
  },

  // Selectors
  selectorLabel: {
    ...typography.label,
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  selectorRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  selectorBtn: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  selectorBtnActive: {
    backgroundColor: "rgba(59,130,246,0.2)",
    borderColor: "rgba(59,130,246,0.5)",
  },
  selectorBtnLong: {
    backgroundColor: "rgba(34,197,94,0.2)",
    borderColor: "rgba(34,197,94,0.5)",
  },
  selectorBtnShort: {
    backgroundColor: "rgba(239,68,68,0.2)",
    borderColor: "rgba(239,68,68,0.5)",
  },
  selectorBtnText: {
    ...typography.label,
    fontSize: 12,
    color: colors.textMuted,
  },
  selectorBtnTextActive: {
    color: colors.textPrimary,
  },

  // Amount buttons
  amountBtn: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  amountBtnActive: {
    backgroundColor: "rgba(59,130,246,0.2)",
    borderColor: "rgba(59,130,246,0.5)",
  },
  amountBtnText: {
    ...typography.label,
    fontSize: 10,
    color: colors.textMuted,
  },
  amountBtnTextActive: {
    color: colors.textPrimary,
  },

  // Action row
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  // Phase status
  phaseStatusRow: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  phaseStatusText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
});
