import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createChart } from "lightweight-charts";

import type { ServerEvent } from "../network/wsClient";
import { WsClient } from "../network/wsClient";
import { useSessionWs } from "./hooks/useSessionWs";
import "./tokens.css";
import "./ui.css";
import "./screens.css";

import { backendWsUrl } from "./net";
import { Button, Panel, Pill, Toggle, NotchSlider } from "./ui";

type TickEvent = { type: "TICK"; sessionId: string; tickIndex: number; price: number; phase: string; timeRemainingMs: number; closingRemainingMs: number };
type SessionState = { type: "SESSION_STATE"; sessionId: string; phase: string; tickIndex: number; price: number; timeRemainingMs: number; closingRemainingMs: number; history?: Array<{ tickIndex: number; price: number }> };
type PlayerHud = { type: "PLAYER_HUD"; sessionId: string; scoreDisplay: number; scoreRealized: number; markersRemaining: number; hasOpen: boolean; openPosition?: any; flags?: any };

export function PrintrGame(){
  const nav = useNavigate();
  const { sessionId } = useParams();
  const sid = String(sessionId ?? "");

  const [phase, setPhase] = useState("LIVE");
  const [price, setPrice] = useState<number>(0);
  const [tickIndex, setTickIndex] = useState<number>(0);
  const [timeRemainingMs, setTimeRemainingMs] = useState<number>(0);
  const [markers, setMarkers] = useState<number>(0);
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

  const timeText = useMemo(() => fmtTime(timeRemainingMs), [timeRemainingMs]);

  const { ws, connectivity, playerId } = useSessionWs(sid);

  useEffect(() => {
    if (!sid) return;
    const client = ws.current;
    if (!client) return;

    return client.onEvent((ev: ServerEvent) => {
      if ((ev as any)?.sessionId !== sid) return;

      if (ev.type === "SESSION_STATE") {
        const s = ev as any as SessionState;
        setPhase(s.phase);
        setPrice(s.price);
        setTickIndex(s.tickIndex);
        setTimeRemainingMs(s.timeRemainingMs);
        if (Array.isArray((s as any).history) && (s as any).history.length) seedChart((s as any).history);
      }

      if (ev.type === "TICK") {
        const t = ev as any as TickEvent;
        setPhase(t.phase);
        setPrice(t.price);
        setTickIndex(t.tickIndex);
        setTimeRemainingMs(t.timeRemainingMs);
        pushPoint({ tickIndex: t.tickIndex, price: t.price });
        setTickFx((x) => x + 1);
      }

      if (ev.type === "PLAYER_HUD") {
        const h = ev as any as PlayerHud;
        setMarkers((h as any).markersRemaining ?? 0);
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

  // --- Chart ---
  const [chartEl, setChartEl] = useState<HTMLDivElement | null>(null);
  const chartRef = React.useRef<any>(null);
  const seriesRef = React.useRef<any>(null);
  const dataRef = React.useRef<Array<{ time: number; value: number }>>([]);

  useEffect(() => {
    if (!chartEl) return;

    const chart = createChart(chartEl, {
      layout: {
        background: { color: "rgba(0,0,0,0)" },
        textColor: "rgba(230,240,255,0.8)",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.05)" }
      },
      rightPriceScale: {
        borderVisible: false
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: true
      },
      crosshair: {
        vertLine: { color: "rgba(130,255,214,0.18)" },
        horzLine: { color: "rgba(130,255,214,0.18)" }
      }
    });

    const series = chart.addAreaSeries({
      lineColor: "rgba(130,255,214,0.95)",
      topColor: "rgba(130,255,214,0.28)",
      bottomColor: "rgba(130,255,214,0.02)",
      lineWidth: 2
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: chartEl.clientWidth, height: chartEl.clientHeight });
      chart.timeScale().fitContent();
    });
    ro.observe(chartEl);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [chartEl]);

  function seedChart(history: Array<{ tickIndex: number; price: number }>) {
    const series = seriesRef.current;
    if (!series) return;
    const base = Math.floor(Date.now() / 1000) - history.length * 5;
    const data = history.map((p, i) => ({ time: base + i * 5, value: p.price }));
    dataRef.current = data;
    series.setData(data);
    chartRef.current?.timeScale()?.fitContent?.();
  }

  function pushPoint(p: { tickIndex: number; price: number }) {
    const series = seriesRef.current;
    if (!series) return;

    const last = dataRef.current[dataRef.current.length - 1];
    const t = last ? last.time + 5 : Math.floor(Date.now() / 1000);
    const point = { time: t, value: p.price };
    dataRef.current = [...dataRef.current.slice(-180), point];
    series.update(point);
  }

  const sendIntent = (intent: "OPEN" | "CLOSE") => {
    if (intent === "OPEN") setCommitFx((x) => x + 1);
    if (intent === "CLOSE") setCloseFx((x) => x + 1);

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
        <header className="p2-top">
          <Button variant="ghost" onClick={()=>nav("/play")}>Exit</Button>
          <div className="p2-topCenter">
            {connectivity !== "open" ? <div className="p2-mini">{connectivity}…</div> : null}
            <Pill tone={phase === "CLOSING" ? "warn" : "live"}>{phase}</Pill>
            <div className="p2-timer">{timeText}</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Button variant="ghost" onClick={()=>setShowProof(true)}>Proof</Button>
          </div>
        </header>

        <div className="p2-gameHud">
          <div className="p2-hudItem">
            <div className="p2-hudLabel">SCORE</div>
            <div className="p2-hudValue">{Math.round(score)}</div>
          </div>
          <div className="p2-hudItem">
            <div className="p2-hudLabel">MARKERS</div>
            <div className="p2-hudValue">{markers}</div>
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

        <div key={tickFx} className={`p2-chartWrap ${tickFx ? "p2-chartBloom" : ""}`}>
          <div className="p2-chart" ref={setChartEl} />
        </div>

        {/* Spacer so the fixed trade pad never covers the chart */}
        <div style={{ height: 160 }} />

        <Panel key={closeFx} className={`p2-pad p2-padFx ${closeFx ? "p2-snapGo" : ""}`}>
          <div className="p2-padRow">
            <Toggle
              options={[{ key: "LONG", label: "LONG" }, { key: "SHORT", label: "SHORT" }]}
              value={dir}
              onChange={(v) => setDir(v as any)}
            />
            <Toggle
              options={[1, 2, 3, 4, 5].map((n) => ({ key: String(n), label: `${n}x` }))}
              value={String(lev)}
              onChange={(v) => setLev(Number(v))}
            />
          </div>

          <div className="p2-padRow">
            <NotchSlider label="COMMIT" value={commit} notches={[100, 250, 500, 750, 1000]} onChange={setCommit} />
          </div>

          <div className="p2-padRow">
            {!hasOpen ? (
              <Button className="p2-big" onClick={()=>sendIntent("OPEN")}>COMMIT</Button>
            ) : (
              <Button className="p2-big" onClick={()=>sendIntent("CLOSE")}>CLOSE</Button>
            )}
          </div>
          {/* Sonar pulse on commit */}
          <div key={commitFx} className={`p2-sonar ${commitFx ? "p2-sonarGo" : ""}`} />
        </Panel>
      </div>

      {showProof && <ProofModal sessionId={sid} onClose={()=>setShowProof(false)} />}
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
