import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Card } from "../components/Card";
import { TopStats } from "../components/TopStats";
import { Avatar } from "../components/Avatar";
import { Badge } from "../components/Badge";
import { useGame } from "../navigation/GameContext";
import { usePlayerHeaders } from "../hooks/usePlayerHeaders";
import { useCreditsBalance } from "../hooks/useCreditsBalance";
import { useWallet } from "../state/WalletProvider";
import { colors } from "../theme/colors";
import { spacing, radius } from "../theme/spacing";
import { typography } from "../theme/typography";

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export function ProfileScreen() {
  const { state } = useGame();
  const player = usePlayerHeaders();
  const { sessionsBalance } = useCreditsBalance(player);
  const [name, setName] = useState("Player");

  const {
    publicKeyStr,
    connected,
    walletName,
    snsName,
    snsLoading,
    connect,
    disconnect,
    connecting,
  } = useWallet();

  // Use SNS name as default nickname when available
  useEffect(() => {
    if (snsName && name === "Player") {
      setName(snsName.replace(/\.sol$/, ""));
    }
  }, [snsName]);

  const avatarSeed = snsName ?? publicKeyStr ?? player?.playerRef ?? "default";
  const displayName = snsName ?? (publicKeyStr ? truncateAddress(publicKeyStr) : null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TopStats points={state.points} streak={state.streak} sessions={sessionsBalance} />

      {/* Wallet Connection Card */}
      <Card title="Wallet">
        {connected ? (
          <View style={styles.walletConnected}>
            <View style={styles.walletInfo}>
              <View style={styles.walletRow}>
                {snsLoading ? (
                  <ActivityIndicator size="small" color={colors.accentTeal} />
                ) : snsName ? (
                  <Text style={styles.snsName}>{snsName}</Text>
                ) : null}
                {walletName ? (
                  <Badge
                    text={walletName === "phantom" ? "PHANTOM" : "MWA"}
                    tone="purple"
                  />
                ) : null}
              </View>
              {publicKeyStr ? (
                <Text style={styles.walletAddress}>
                  {truncateAddress(publicKeyStr)}
                </Text>
              ) : null}
            </View>
            <Pressable style={styles.disconnectBtn} onPress={disconnect}>
              <Text style={styles.disconnectBtnText}>DISCONNECT</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.walletDisconnected}>
            <Text style={styles.walletHint}>
              Connect your Solana wallet to link your .sol identity and appear on
              leaderboards with your SNS name.
            </Text>
            <Pressable
              style={[styles.connectBtn, connecting && styles.connectBtnDisabled]}
              onPress={connect}
              disabled={connecting}
            >
              {connecting ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <Text style={styles.connectBtnText}>CONNECT WALLET</Text>
              )}
            </Pressable>
          </View>
        )}
      </Card>

      {/* Profile Card */}
      <Card title="Profile">
        <View style={styles.avatarRow}>
          <Avatar seed={avatarSeed} size={64} />
          <View style={styles.avatarInfo}>
            {displayName ? (
              <Text style={styles.displayName}>{displayName}</Text>
            ) : null}
            <Text style={styles.label}>Sessions Balance</Text>
            <Text style={styles.value}>{sessionsBalance ?? "--"}</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Nickname</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholderTextColor="rgba(241,245,249,0.4)"
            placeholder="Enter nickname"
          />
        </View>

        <View style={styles.statsGrid}>
          {[
            { label: "Tokens", value: String(state.tokens) },
            { label: "Best Streak", value: String(state.streak) },
            { label: "Tier", value: state.selection.tier },
            { label: "Direction", value: state.selection.direction },
          ].map((s) => (
            <View key={s.label} style={styles.statBox}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.refRow}>
          <Text style={[styles.label, { opacity: 0.6 }]}>Player Ref</Text>
          <Text style={[styles.caption, { opacity: 0.5 }]}>
            {player?.playerRef ?? "loading..."}
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },

  // Wallet section
  walletConnected: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  walletInfo: { flex: 1 },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  snsName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.accentTeal,
    letterSpacing: 0.5,
  },
  walletAddress: {
    fontSize: 12,
    fontFamily: "monospace",
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  disconnectBtn: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  disconnectBtnText: {
    ...typography.label,
    fontSize: 10,
    color: colors.stateLoss,
  },
  walletDisconnected: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  walletHint: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  connectBtn: {
    backgroundColor: "rgba(139,92,246,0.2)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.4)",
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    minWidth: 180,
    alignItems: "center",
  },
  connectBtnDisabled: { opacity: 0.5 },
  connectBtnText: {
    ...typography.label,
    fontSize: 12,
    color: colors.primaryPurple,
    letterSpacing: 1,
  },

  // Profile section
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  avatarInfo: { flex: 1 },
  displayName: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.accentTeal,
    marginBottom: 4,
  },
  field: { marginBottom: 14 },
  label: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: 6,
  },
  value: { fontSize: 22, fontWeight: "800", color: colors.textPrimary },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 12,
    padding: 12,
    color: colors.textPrimary,
    fontSize: 14,
    backgroundColor: colors.surfaceInput,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  statBox: {
    width: "47%",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceInput,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 4,
  },
  caption: { fontSize: 12, color: colors.textMuted },
  refRow: { marginTop: 14 },
});
