import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createChart } from "lightweight-charts";

import type { ServerEvent } from "../network/wsClient";
import { WsClient } from "../network/wsClient";
import { useSessionWs } from "./hooks/useSessionWs";
import "./tokens.css";
import "./ui.css";
import "./screens.css";

import { backendWsUrl, backendHttpBase } from "./net";
import { Button, Panel, Pill, Toggle, NotchSlider, TopBar, TopActions } from "./ui";
import { TapeChart } from "./ui/TapeChart";
import { ConnectButton } from "./wallet/ConnectButton";
import { ShareSheet } from "./share/ShareSheet";

type TickEvent = { type: "TICK"; sessionId: string; tickIndex: number; price: number; phase: string; timeRemainingMs: number; closingRemainingMs: number };
type SessionState = { type: "SESSION_STATE"; sessionId: string; phase: string; tickIndex: number; price: number; timeRemainingMs: number; closingRemainingMs: number; history?: Array<{ tickIndex: number; price: number }> };
type PlayerHud = { type: "PLAYER_HUD"; sessionId: string; scoreDisplay: number; scoreRealized: number; markersRemaining: number; hasOpen: boolean; openPosition?: any; flags?: any };

export function PrintrGame(){
  const nav = useNavigate();
  const { sessionId } = useParams();
  const sid = String(sessionId ?? "");

  const [phase, setPhase] = useState<"LIVE"|"CLOSING"|"ENDED">("LIVE");
  const [price, setPrice] = useState<number>(0);
  const [tickIndex, setTickIndex] = useState<number>(0);
  const [timeRemainingMs, setTimeRemainingMs] = useState<number>(0);
  const [commitsRemaining, setCommitsRemaining] = useState<number>(0);
  const isSpectating = commitsRemaining <= 0;
  const [score, setScore] = useState<number>(0);
  const [hasOpen, setHasOpen] = useState<boolean>(false);
  const [commit, setCommit] = useState(250);
  const [lev, setLev] = useState(1);
  const [dir, setDir] = useState<"LONG"|"SHORT">("LONG");
  const [showProof, setShowProof] = useState(false);
  const [commitFx, setCommitFx] = useState(0);
  const [closeFx, setCloseFx] = useState(0);
  const [tickFx, setTickFx] = useState(0);
  const [lastFx, setLastFx] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [padTab, setPadTab] = useState<"TRADE"|"HISTORY">("TRADE");

  const [posHistory, setPosHistory] = useState<Array<{
    id: string;
    side: "LONG" | "SHORT";
    lev: number;
    commit: number;
    entryPrice: number;
    entryTick: number;
    exitPrice?: number;
    exitTick?: number;
  }>>([]);

  const timeText = useMemo(() => fmtTime(timeRemainingMs), [timeRemainingMs]);

  const { ws, connectivity, playerId } = useSessionWs(sid);

  // No HTTP fallback: WS should always be available to backend.

  useEffect(() => {
    if (!sid) return;
    const client = ws.current;
    if (!client) return;

    return client.onEvent((ev: ServerEvent) => {
      if ((ev as any)?.sessionId !== sid) return;

      if (ev.type === "SESSION_STATE") {
        const s = ev as any as SessionState;
        setPhase((s.phase as any) ?? "LIVE");
        setPrice(s.price);
        setTickIndex(s.tickIndex);
        setTimeRemainingMs(s.timeRemainingMs);
        if (Array.isArray((s as any).history) && (s as any).history.length) seedChart((s as any).history);
      }

      if (ev.type === "TICK") {
        const t = ev as any as TickEvent;
        setPhase((t.phase as any) ?? phase);
        setPrice(t.price);
        setTickIndex(t.tickIndex);
        setTimeRemainingMs(t.timeRemainingMs);
        pushPoint({ tickIndex: t.tickIndex, price: t.price });
        setTickFx((x) => x + 1);
      }

      if (ev.type === "PLAYER_HUD") {
        const h = ev as any as PlayerHud;
        setCommitsRemaining((h as any).commitsRemaining ?? (h as any).markersRemaining ?? 0);
        setScore((h as any).scoreDisplay ?? 0);
        setHasOpen(!!(h as any).hasOpen);
      }

      if (ev.type === "FX_EVENT") {
        const fx = String((ev as any).fx ?? "");
        if (fx) {
          setLastFx(fx);
          setTimeout(() => setLastFx((cur) => (cur === fx ? null : cur)), 900);
        }
      }
    });
  }, [sid, ws]);

  // --- Tape ---
  const [tapePrices, setTapePrices] = useState<number[]>([]);

  function seedChart(history: Array<{ tickIndex: number; price: number }>) {
    setTapePrices(history.map((p) => Number(p.price ?? 0)).slice(-180));
  }

  function pushPoint(p: { tickIndex: number; price: number }) {
    setTapePrices((cur) => [...cur.slice(-179), Number(p.price ?? 0)]);
  }

  const sendIntent = (intent: "OPEN" | "CLOSE") => {
    if (intent === "OPEN") setCommitFx((x) => x + 1);
    if (intent === "CLOSE") setCloseFx((x) => x + 1);

    // Local history (client-side). Server can be added later.
    if (intent === "OPEN") {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setPosHistory((h) => [{ id, side: dir, lev, commit, entryPrice: price, entryTick: tickIndex }, ...h].slice(0, 30));
      setPadTab("TRADE");
    }
    if (intent === "CLOSE") {
      setPosHistory((h) => {
        const next = [...h];
        const open = next.find((x) => x.exitTick == null);
        if (open) {
          open.exitPrice = price;
          open.exitTick = tickIndex;
        }
        return next;
      });
      setPadTab("HISTORY");
    }

    // Prefer the persistent session WS.
    const client = ws.current;
    if (client) {
      client.send({
        type: "PLAYER_INTENT",
        sessionId: sid,
        playerId,
        intent,
        payload: intent === "OPEN"
          ? { commitPoints: commit, leverage: lev, direction: dir }
          : {},
        clientTs: Date.now()
      });
      return;
    }

    // Fallback: fire-and-forget.
    const temp = new WsClient();
    temp.connect(backendWsUrl(playerId));
    temp.send({
      type: "PLAYER_INTENT",
      sessionId: sid,
      playerId,
      intent,
      payload: intent === "OPEN"
        ? { commitPoints: commit, leverage: lev, direction: dir }
        : {},
      clientTs: Date.now()
    });
    setTimeout(() => temp.close(), 350);
  };

  return (
    <div className="p2-root">
      <div className="p2-noise" />
      <div className="p2-frame p2-gameFrame">
        <TopBar
          left={<Button variant="ghost" onClick={()=>nav("/play")}>Exit</Button>}
          center={(
            <>
              {connectivity !== "open" ? <div className="p2-mini p2-error">WS {connectivity}</div> : <div className="p2-mini">WS OPEN</div>}
              <Pill tone={phase === "CLOSING" ? "warn" : "live"}>{phase}</Pill>
              <div className="p2-timer">{timeText}</div>
            </>
          )}
          right={(
            <TopActions>
              <Button variant="ghost" onClick={()=>setShareOpen(true)}>Share</Button>
              <Button variant="ghost" onClick={()=>setShowProof(true)}>Proof</Button>
            </TopActions>
          )}
        />

        {phase === "CLOSING" ? (
          <div className="p2-fxToast" style={{ background: "rgba(255,204,102,.08)", borderColor: "rgba(255,204,102,.22)" }}>
            CLOSING: commits locked. Close clean.
          </div>
        ) : isSpectating ? (
          <div className="p2-fxToast" style={{ background: "rgba(255,255,255,.06)", borderColor: "rgba(255,255,255,.14)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>SPECTATING • buy credits to commit</div>
              <Button variant="secondary" onClick={() => nav("/store")}>Store</Button>
            </div>
          </div>
        ) : null}

        <div className="p2-gameHud">
          <div className="p2-hudItem">
            <div className="p2-hudLabel">SCORE</div>
            <div className="p2-hudValue">{Math.round(score)}</div>
          </div>
          <div className="p2-hudItem">
            <div className="p2-hudLabel">COMMITS</div>
            <div className="p2-hudValue">{commitsRemaining}</div>
          </div>
          <div className="p2-hudItem">
            <div className="p2-hudLabel">PRICE</div>
            <div className="p2-hudValue">{price.toFixed(3)}</div>
          </div>
          <div className="p2-hudItem">
            <div className="p2-hudLabel">TICK</div>
            <div className="p2-hudValue">{tickIndex}</div>
          </div>
        </div>

        {lastFx ? <div className="p2-fxToast">{lastFx.split("_").join(" ")}</div> : null}

        <div className={["p2-chartWrap", tickFx ? "p2-chartBloom" : ""].join(" ")}>
          <div className="p2-chart">
            <TapeChart
              prices={tapePrices}
              tickMs={5000}
              markers={posHistory.map((p, idx) => ({
                kind: p.exitTick != null ? "CLOSE" : "OPEN",
                side: p.side,
                // best-effort marker placement near the most recent points
                idx: Math.max(0, tapePrices.length - 1 - idx * 6)
              }))}
            />
          </div>
        </div>

        {/* Spacer so the fixed trade pad never covers the chart */}
        <div style={{ height: 160 }} />

        <Panel
          key={`close-${closeFx}`}
          className={`p2-pad p2-padFx ${closeFx ? "p2-snapGo" : ""}`}
          style={{ maxHeight: "44vh", overflow: "auto" }}
        >
          <div className="p2-padTabs">
            <button type="button" className={padTab === "TRADE" ? "p2-tab p2-tabOn" : "p2-tab"} onClick={() => setPadTab("TRADE")}>TRADE</button>
            <button type="button" className={padTab === "HISTORY" ? "p2-tab p2-tabOn" : "p2-tab"} onClick={() => setPadTab("HISTORY")}>HISTORY</button>
          </div>

          {padTab === "TRADE" ? (
            <>
              <div className="p2-padRow">
                <Toggle
                  options={[{ key: "LONG", label: "LONG" }, { key: "SHORT", label: "SHORT" }]}
                  value={dir}
                  onChange={(v) => setDir(v as any)}
                />
                <Toggle
                  options={[1, 3, 5].map((n) => ({ key: String(n), label: `${n}x` }))}
                  value={String(lev)}
                  onChange={(v) => setLev(Number(v))}
                />
              </div>

          <div className="p2-padRow">
            <NotchSlider label="COMMIT" value={commit} notches={[100, 250, 500, 750, 1000]} onChange={setCommit} />
          </div>

          <div className="p2-padRow">
            {!hasOpen ? (
              <Button
                className="p2-big"
                variant={phase === "CLOSING" ? "secondary" : "primary"}
                onClick={() => {
                  if (phase === "CLOSING") {
                    setLastFx("COMMIT_LOCKED");
                    setTimeout(() => setLastFx((cur) => (cur === "COMMIT_LOCKED" ? null : cur)), 900);
                    return;
                  }
                  sendIntent("OPEN");
                }}
              >
                COMMIT
              </Button>
            ) : (
              <Button className="p2-big" onClick={()=>sendIntent("CLOSE")}>CLOSE</Button>
            )}
          </div>
          {/* Sonar pulse on commit */}
          <div key={`commit-${commitFx}`} className={`p2-sonar ${commitFx ? "p2-sonarGo" : ""}`} />
            </>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {posHistory.length === 0 ? (
                <div className="p2-mini" style={{ opacity: 0.8 }}>No positions yet.</div>
              ) : (
                posHistory.map((p) => {
                  const pnl = (p.exitPrice != null)
                    ? ((p.side === "LONG" ? (p.exitPrice - p.entryPrice) : (p.entryPrice - p.exitPrice)) * p.lev)
                    : null;
                  return (
                    <div key={p.id} className="p2-row" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 900, letterSpacing: 0.6 }}>{p.side} {p.lev}x • {p.commit}</div>
                        <div className="p2-mini" style={{ opacity: 0.75 }}>
                          in @{p.entryTick} {p.entryPrice.toFixed(3)}
                          {p.exitTick != null ? ` → out @${p.exitTick} ${p.exitPrice!.toFixed(3)}` : " → open"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 900, color: pnl == null ? "rgba(234,242,255,.85)" : (pnl >= 0 ? "rgba(130,255,214,.95)" : "rgba(255,120,120,.95)") }}>
                          {pnl == null ? "—" : (pnl >= 0 ? "+" : "") + pnl.toFixed(2)}
                        </div>
                        <div className="p2-mini" style={{ opacity: 0.7 }}>{p.exitTick != null ? "closed" : "open"}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </Panel>
      </div>

      {showProof && <ProofModal sessionId={sid} onClose={()=>setShowProof(false)} />}
      {shareOpen && <ShareSheet sessionId={sid} onClose={() => setShareOpen(false)} />}
    </div>
  );
}

function fmtTime(ms: number){
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2,"0")}`;
}

function ProofModal({ sessionId, onClose }: { sessionId: string; onClose: () => void }){
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    fetch(`${window.location.protocol}//${window.location.hostname}:3001/api/sessions/${sessionId}/proof`)
      .then(r => r.json())
      .then(j => { if (alive) setData(j); })
      .catch(()=>{ if (alive) setData({ ok: false }); });
    return () => { alive = false; };
  }, [sessionId]);

  return (
    <div className="p2-modalBack" role="dialog" aria-modal="true">
      <div className="p2-modal">
        <div className="p2-modalHeader">
          <div className="p2-modalTitle">Proof</div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
        {!data ? (
          <div className="p2-sub">Loading…</div>
        ) : (
          <div className="p2-proof">
            <div className="p2-mini">STATUS</div>
            <div className="p2-proofVal">{String(data.status ?? "UNKNOWN")}</div>

            <div className="p2-mini" style={{ marginTop: 10 }}>COMMITMENT</div>
            <div className="p2-proofMono">{String(data.commitment ?? "")}</div>

            <div className="p2-mini" style={{ marginTop: 10 }}>SWITCHBOARD</div>
            {data.vrf?.explorerTxUrl ? (
              <a className="p2-link" href={data.vrf.explorerTxUrl} target="_blank" rel="noreferrer">Open explorer tx</a>
            ) : (
              <div className="p2-sub">No explorer link.</div>
            )}

            {data.reveal?.serverSecretHex ? (
              <>
                <div className="p2-mini" style={{ marginTop: 10 }}>REVEAL</div>
                <div className="p2-proofMono">{String(data.reveal.serverSecretHex)}</div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
