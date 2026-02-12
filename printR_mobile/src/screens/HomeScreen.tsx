import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PlayStackParamList } from "../navigation/types";
import { useGame } from "../navigation/GameContext";
import { usePlayerHeaders } from "../hooks/usePlayerHeaders";
import { useCreditsBalance } from "../hooks/useCreditsBalance";
import { useActiveSessions, type ActiveSession } from "../hooks/useActiveSessions";
import { API_BASE, apiGet } from "../network/httpClient";
import { getWsPlayerId } from "../network/wsClient";
import { TopStats } from "../components/TopStats";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { ListRow } from "../components/ListRow";
import { EmptyState } from "../components/EmptyState";
import { colors } from "../theme/colors";
import { spacing, radius } from "../theme/spacing";
import { typography } from "../theme/typography";

type Nav = NativeStackNavigationProp<PlayStackParamList, "Home">;

type LiveSession = {
  id: string;
  phase: string;
  assetName?: string;
  price?: number;
  activePlayers?: number;
  tickIndex?: number;
};

type LeaderboardEntry = {
  playerRef: string;
  nickname?: string;
  points: number;
  rank: number;
};

type SessionHighscore = {
  sessionId: string;
  playerRef: string;
  nickname?: string;
  score: number;
  rank: number;
};

function toWsUrl(httpBase: string): string {
  return httpBase.replace(/^http/, "ws") + "/ws";
}

function phaseTone(phase: string): "win" | "warn" | "blue" | "purple" | "teal" {
  switch (phase) {
    case "LIVE":
      return "win";
    case "FINAL_COMMIT_WARNING":
      return "warn";
    case "CLOSING":
      return "purple";
    case "ENDED":
      return "teal";
    default:
      return "blue";
  }
}

export default function HomeScreen() {
  const game = useGame();
  const { state, playRound, resumeSession, navigate: gameNavigate } = game;
  const nav = useNavigation<Nav>();
  const playerHeaders = usePlayerHeaders();
  const { sessionsBalance, refresh: refreshBalance } = useCreditsBalance(playerHeaders);
  const { activeSessions, refresh: refreshActive } = useActiveSessions(playerHeaders);

  const [wsPlayerId, setWsPlayerId] = useState<string | null>(null);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [highscores, setHighscores] = useState<SessionHighscore[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize async WS player ID
  useEffect(() => {
    getWsPlayerId().then(setWsPlayerId);
  }, []);

  // Fetch live sessions
  const fetchSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const res = await fetch(`${API_BASE}/sessions`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLiveSessions(data);
        }
      }
    } catch {
      // silent
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    if (!playerHeaders) return;
    try {
      const data = await apiGet<LeaderboardEntry[]>("/api/leaderboard", playerHeaders);
      if (Array.isArray(data)) {
        setLeaderboard(data.slice(0, 5));
      }
    } catch {
      // silent
    }
  }, [playerHeaders]);

  // Fetch session highscores
  const fetchHighscores = useCallback(async () => {
    if (!playerHeaders) return;
    try {
      const data = await apiGet<SessionHighscore[]>("/api/highscores", playerHeaders);
      if (Array.isArray(data)) {
        setHighscores(data.slice(0, 5));
      }
    } catch {
      // silent
    }
  }, [playerHeaders]);

  // Initial load + polling
  useEffect(() => {
    fetchSessions();
    fetchLeaderboard();
    fetchHighscores();

    pollRef.current = setInterval(() => {
      fetchSessions();
    }, 10000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchSessions, fetchLeaderboard, fetchHighscores]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchSessions(),
      refreshBalance(),
      refreshActive(),
      fetchLeaderboard(),
      fetchHighscores(),
    ]);
    setRefreshing(false);
  }, [fetchSessions, refreshBalance, refreshActive, fetchLeaderboard, fetchHighscores]);

  // Join a session
  const handleJoin = useCallback(
    async (sessionId: string) => {
      if (joining) return;
      setJoining(sessionId);
      try {
        const result = await playRound(sessionId);
        if (result.ok) {
          nav.navigate("LiveRound", { sessionId: result.sessionId });
        } else {
          const reason = result.reason;
          if (reason === "INSUFFICIENT") {
            Alert.alert("Insufficient Sessions", "Purchase more sessions in the Store to play.");
          } else if (reason === "NOT_JOINABLE") {
            Alert.alert("Session Unavailable", "This session is no longer joinable.");
          } else if (reason === "RATE_LIMITED") {
            Alert.alert("Rate Limited", "Please wait before joining another session.");
          } else {
            Alert.alert("Join Failed", reason || "Unable to join session.");
          }
        }
      } catch {
        Alert.alert("Error", "Failed to join session.");
      } finally {
        setJoining(null);
      }
    },
    [joining, playRound, nav]
  );

  // Resume an active session
  const handleResume = useCallback(
    async (sessionId: string) => {
      if (joining) return;
      setJoining(sessionId);
      try {
        const result = await resumeSession(sessionId);
        if (result.ok) {
          nav.navigate("LiveRound", { sessionId: result.sessionId });
        } else {
          Alert.alert("Resume Failed", result.reason || "Unable to resume session.");
        }
      } catch {
        Alert.alert("Error", "Failed to resume session.");
      } finally {
        setJoining(null);
      }
    },
    [joining, resumeSession, nav]
  );

  // Watch (spectate) a session
  const handleWatch = useCallback(
    (sessionId: string) => {
      nav.navigate("LiveRound", { sessionId });
    },
    [nav]
  );

  const nonEndedSessions = useMemo(
    () => liveSessions.filter((s) => s.phase !== "ENDED"),
    [liveSessions]
  );

  const tips = [
    "SAFE tier has the highest win rate. Great for building streaks.",
    "BOLD tier offers higher rewards but tighter timing windows.",
    "LEGEND tier is for elite players. Razor-thin margins, massive payouts.",
    "Keep your streak alive for bonus multipliers.",
    "Watch sessions first to learn the rhythm before committing.",
  ];
  const tipIndex = useMemo(() => Math.floor(Date.now() / 60000) % tips.length, []);

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

      {/* Live Sessions Card */}
      <Card title="Live Sessions" subtitle="Join or watch active sessions">
        {loadingSessions && nonEndedSessions.length === 0 ? (
          <ActivityIndicator color={colors.primaryBlue} style={{ paddingVertical: 24 }} />
        ) : nonEndedSessions.length === 0 ? (
          <EmptyState
            title="No Active Sessions"
            subtitle="Check back soon for new sessions."
          />
        ) : (
          nonEndedSessions.map((session) => (
            <View key={session.id} style={styles.sessionRow}>
              <View style={styles.sessionInfo}>
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionAsset}>
                    {session.assetName || "BTC/USD"}
                  </Text>
                  <Badge text={session.phase} tone={phaseTone(session.phase)} />
                </View>
                {session.price != null ? (
                  <Text style={styles.sessionPrice}>
                    ${session.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                ) : null}
                {session.activePlayers != null ? (
                  <Text style={styles.sessionPlayers}>
                    {session.activePlayers} player{session.activePlayers !== 1 ? "s" : ""}
                  </Text>
                ) : null}
              </View>
              <View style={styles.sessionActions}>
                {session.phase === "LIVE" || session.phase === "FINAL_COMMIT_WARNING" ? (
                  <Pressable
                    style={[styles.joinBtn, joining === session.id && styles.joinBtnDisabled]}
                    onPress={() => handleJoin(session.id)}
                    disabled={joining === session.id}
                  >
                    {joining === session.id ? (
                      <ActivityIndicator size="small" color={colors.textPrimary} />
                    ) : (
                      <Text style={styles.joinBtnText}>JOIN</Text>
                    )}
                  </Pressable>
                ) : null}
                <Pressable
                  style={styles.watchBtn}
                  onPress={() => handleWatch(session.id)}
                >
                  <Text style={styles.watchBtnText}>WATCH</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </Card>

      {/* My Active Positions Card */}
      {activeSessions.length > 0 ? (
        <Card title="My Active Positions" subtitle="Resume your open sessions">
          {activeSessions.map((s) => (
            <View key={s.sessionId} style={styles.sessionRow}>
              <View style={styles.sessionInfo}>
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionAsset}>
                    {s.assetName || "Session"}
                  </Text>
                  <Badge text={s.phase} tone={phaseTone(s.phase)} />
                  <Badge text={s.mode.toUpperCase()} tone={s.mode === "play" ? "blue" : "teal"} />
                </View>
                {s.price != null ? (
                  <Text style={styles.sessionPrice}>
                    ${s.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                ) : null}
              </View>
              <Pressable
                style={[styles.joinBtn, joining === s.sessionId && styles.joinBtnDisabled]}
                onPress={() => handleResume(s.sessionId)}
                disabled={joining === s.sessionId}
              >
                {joining === s.sessionId ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : (
                  <Text style={styles.joinBtnText}>RESUME</Text>
                )}
              </Pressable>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Buy Sessions Card */}
      <Card title="Buy Sessions" subtitle="Get more sessions to keep playing">
        <Pressable
          style={styles.buyRow}
          onPress={() => gameNavigate("store")}
        >
          <View>
            <Text style={styles.buyTitle}>Starter Pack</Text>
            <Text style={styles.buyDesc}>40 sessions - $10</Text>
          </View>
          <Text style={styles.buyArrow}>{">"}</Text>
        </Pressable>
        <Pressable
          style={styles.buyRow}
          onPress={() => gameNavigate("store")}
        >
          <View>
            <Text style={styles.buyTitle}>Pro Pack</Text>
            <Text style={styles.buyDesc}>500 sessions - $100</Text>
          </View>
          <Text style={styles.buyArrow}>{">"}</Text>
        </Pressable>
      </Card>

      {/* Leaderboard Snapshot Card */}
      <Card title="Leaderboard Snapshot" subtitle="Top players this week">
        {leaderboard.length === 0 ? (
          <EmptyState title="No Data" subtitle="Leaderboard will appear once players compete." />
        ) : (
          leaderboard.map((entry, i) => (
            <ListRow
              key={entry.playerRef}
              left={`#${entry.rank ?? i + 1}  ${entry.nickname || entry.playerRef.slice(0, 12)}`}
              right={
                <Text style={styles.leaderScore}>
                  {entry.points.toLocaleString()} pts
                </Text>
              }
            />
          ))
        )}
        <Pressable
          style={styles.seeAllBtn}
          onPress={() => gameNavigate("leaderboard")}
        >
          <Text style={styles.seeAllText}>See Full Leaderboard</Text>
        </Pressable>
      </Card>

      {/* Session Highscores Card */}
      <Card title="Session Highscores" subtitle="Top session scores">
        {highscores.length === 0 ? (
          <EmptyState title="No Highscores" subtitle="Complete sessions to set highscores." />
        ) : (
          highscores.map((entry, i) => (
            <ListRow
              key={`${entry.sessionId}-${entry.playerRef}`}
              left={`#${entry.rank ?? i + 1}  ${entry.nickname || entry.playerRef.slice(0, 12)}`}
              sub={`Session: ${entry.sessionId.slice(0, 8)}...`}
              right={
                <Text style={styles.leaderScore}>
                  {entry.score.toLocaleString()}
                </Text>
              }
            />
          ))
        )}
        <Pressable
          style={styles.seeAllBtn}
          onPress={() => gameNavigate("history")}
        >
          <Text style={styles.seeAllText}>See All Highscores</Text>
        </Pressable>
      </Card>

      {/* Tip Card */}
      <Card>
        <View style={styles.tipRow}>
          <Text style={styles.tipLabel}>TIP</Text>
          <Text style={styles.tipText}>{tips[tipIndex]}</Text>
        </View>
      </Card>

      {/* Bottom spacer */}
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

  // Session rows
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  sessionInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sessionAsset: {
    ...typography.heading,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sessionPrice: {
    ...typography.body,
    color: colors.accentTeal,
    fontVariant: ["tabular-nums"],
  },
  sessionPlayers: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  sessionActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  // Buttons
  joinBtn: {
    backgroundColor: "rgba(59,130,246,0.25)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.4)",
    minWidth: 72,
    alignItems: "center",
  },
  joinBtnDisabled: {
    opacity: 0.5,
  },
  joinBtnText: {
    ...typography.label,
    fontSize: 11,
    color: colors.primaryBlue,
  },
  watchBtn: {
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: "center",
  },
  watchBtnText: {
    ...typography.label,
    fontSize: 11,
    color: colors.textMuted,
  },

  // Buy rows
  buyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  buyTitle: {
    ...typography.heading,
    fontSize: 14,
    color: colors.textPrimary,
  },
  buyDesc: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  buyArrow: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: "600",
  },

  // Leaderboard
  leaderScore: {
    ...typography.label,
    fontSize: 12,
    color: colors.accentTeal,
  },

  // See all
  seeAllBtn: {
    alignItems: "center",
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  seeAllText: {
    ...typography.label,
    fontSize: 11,
    color: colors.primaryBlue,
  },

  // Tip
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  tipLabel: {
    ...typography.label,
    fontSize: 10,
    color: colors.stateWarn,
    backgroundColor: "rgba(245,158,11,0.15)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  tipText: {
    ...typography.body,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 20,
  },
});
