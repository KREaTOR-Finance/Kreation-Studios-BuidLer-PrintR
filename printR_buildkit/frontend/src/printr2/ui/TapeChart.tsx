import React, { useEffect, useMemo, useRef } from "react";

type Range = { min: number; max: number };

type Marker = { kind: "OPEN" | "CLOSE"; side?: "LONG" | "SHORT"; idx: number };

type DrawState = {
  draw: () => void;
  resize: () => void;
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function TapeChart(props: {
  prices: number[];
  tickMs?: number; // expected tick interval for smooth advance
  height?: number; // px (optional)
  markers?: Marker[];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // stable drawing state; don't recreate observers every tick
  const stateRef = useRef<DrawState | null>(null);

  const rangeRef = useRef<Range | null>(null);
  const dprRef = useRef<number>(1);

  const tickMsRef = useRef<number>(props.tickMs ?? 5000);
  const pricesRef = useRef<number[]>(props.prices ?? []);
  const heightRef = useRef<number | undefined>(props.height);
  const markersMemo = useMemo(() => props.markers ?? [], [props.markers]);
  const markersRef = useRef<Marker[]>(markersMemo);

  // scrolling/advance
  const lastTickAtRef = useRef<number>(performance.now());
  const offsetRef = useRef<number>(0); // 0..1 between ticks
  const prevPricesRef = useRef<number[] | null>(null);
  const crossfadeAtRef = useRef<number>(0);

  // update refs on prop change
  useEffect(() => {
    tickMsRef.current = props.tickMs ?? 5000;

    // Detect a new tick by change in last price OR array length change.
    const prev = pricesRef.current;
    const next = props.prices ?? [];
    const prevLast = prev.length ? prev[prev.length - 1] : undefined;
    const nextLast = next.length ? next[next.length - 1] : undefined;
    const isNewTick = (prev.length !== next.length) || (prevLast !== nextLast);

    if (isNewTick && next.length >= 2) {
      prevPricesRef.current = prev;
      crossfadeAtRef.current = performance.now();
      lastTickAtRef.current = performance.now();
      offsetRef.current = 0;
    }

    pricesRef.current = next;
    heightRef.current = props.height;
    markersRef.current = markersMemo;
  }, [props.prices, props.height, props.tickMs, markersMemo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    dprRef.current = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

    const resize = () => {
      const dpr = dprRef.current;
      const parent = canvas.parentElement;
      const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, heightRef.current ?? rect.height);

      const nextW = Math.floor(w * dpr);
      const nextH = Math.floor(h * dpr);
      if (canvas.width !== nextW) canvas.width = nextW;
      if (canvas.height !== nextH) canvas.height = nextH;
    };

    const sample = (arr: number[], x: number) => {
      // x can be fractional; sample with linear interp.
      const i0 = Math.floor(x);
      const i1 = Math.min(arr.length - 1, i0 + 1);
      const t = x - i0;
      const a = arr[Math.max(0, Math.min(arr.length - 1, i0))];
      const b = arr[Math.max(0, Math.min(arr.length - 1, i1))];
      return lerp(a, b, t);
    };

    const draw = () => {
      const dpr = dprRef.current;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const prices = pricesRef.current;
      const markers = markersRef.current;
      const tickMs = Math.max(250, tickMsRef.current);

      if (!prices || prices.length < 2) {
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.fillStyle = "rgba(234,242,255,.20)";
        ctx.font = "900 11px ui-sans-serif, system-ui";
        ctx.fillText("WAITING FOR TICKS…", 14, 20);
        ctx.restore();
        return;
      }

      const WINDOW = 180;
      // make a fixed-length buffer for stable x mapping
      const buf: number[] = prices.length >= WINDOW
        ? prices.slice(-WINDOW)
        : Array.from({ length: WINDOW }, (_, i) => prices[Math.max(0, i - (WINDOW - prices.length))]);

      // Offset advances smoothly between ticks
      const now = performance.now();
      const dt = now - lastTickAtRef.current;
      const off = Math.max(0, Math.min(1, dt / tickMs));
      offsetRef.current = off;

      // Create a scrolling effect by sampling the buffer with a fractional shift.
      // As off goes 0→1, the tape moves left by one point.
      const shift = off;

      // Crossfade right at tick boundaries to prevent a visual snap when the buffer shifts.
      const prev = prevPricesRef.current;
      let blend = 0;
      const crossfadeAge = now - crossfadeAtRef.current;
      if (prev && crossfadeAge >= 0 && crossfadeAge < 220) blend = 1 - crossfadeAge / 220;

      let prevBuf: number[] | null = null;
      if (blend > 0 && prev && prev.length >= 2) {
        prevBuf = prev.length >= WINDOW
          ? prev.slice(-WINDOW)
          : Array.from({ length: WINDOW }, (_, i) => prev[Math.max(0, i - (WINDOW - prev.length))]);
      }

      // Determine smoothed y-range from the *current* buffer.
      const targetMin = Math.min(...buf);
      const targetMax = Math.max(...buf);
      const pad = Math.max(1e-9, (targetMax - targetMin) * 0.12);
      const tMin = targetMin - pad;
      const tMax = targetMax + pad;

      const cur = rangeRef.current;
      if (!cur) {
        rangeRef.current = { min: tMin, max: tMax };
      } else {
        const k = 0.08;
        cur.min = cur.min + (tMin - cur.min) * k;
        cur.max = cur.max + (tMax - cur.max) * k;
      }

      const min = rangeRef.current!.min;
      const max = rangeRef.current!.max;
      const span = Math.max(1e-9, max - min);

      const padX = 18 * dpr;
      const padY = 18 * dpr;
      const innerW = w - padX * 2;
      const innerH = h - padY * 2;

      const xFor = (i: number) => padX + (i / (WINDOW - 1)) * innerW;
      const yFor = (p: number) => padY + (1 - (p - min) / span) * innerH;

      const pointAt = (i: number) => {
        const curV = sample(buf, i + shift);
        if (prevBuf && blend > 0) {
          const prevV = sample(prevBuf, i + shift);
          return lerp(curV, prevV, blend);
        }
        return curV;
      };

      // tape glow
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      ctx.beginPath();
      for (let i = 0; i < WINDOW; i++) {
        const x = xFor(i);
        const y = yFor(pointAt(i));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(130,255,214,.16)";
      ctx.lineWidth = 10 * dpr;
      ctx.stroke();

      ctx.beginPath();
      for (let i = 0; i < WINDOW; i++) {
        const x = xFor(i);
        const y = yFor(pointAt(i));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(130,255,214,.92)";
      ctx.lineWidth = 2.25 * dpr;
      ctx.stroke();

      // markers (best-effort: these are index-based against raw prices, so keep simple)
      for (const m of markers) {
        const idx = Math.max(0, Math.min(prices.length - 1, m.idx));
        // map raw idx into window coords from the right
        const rel = prices.length - 1 - idx; // 0 = most recent
        const xIdx = Math.max(0, WINDOW - 1 - rel);
        const x = xFor(xIdx);
        const y = yFor(pointAt(xIdx));

        if (m.kind === "OPEN") {
          const up = m.side !== "SHORT";
          ctx.beginPath();
          const s = 7 * dpr;
          ctx.moveTo(x, y + (up ? s : -s));
          ctx.lineTo(x - s, y + (up ? -s : s));
          ctx.lineTo(x + s, y + (up ? -s : s));
          ctx.closePath();
          ctx.fillStyle = up ? "rgba(130,255,214,.95)" : "rgba(255,120,120,.95)";
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, 5 * dpr, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(234,242,255,.7)";
          ctx.lineWidth = 2 * dpr;
          ctx.stroke();
        }
      }

      // edge vignette
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "rgba(0,0,0,.22)");
      grad.addColorStop(0.12, "rgba(0,0,0,0)");
      grad.addColorStop(0.88, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,.22)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    };

    stateRef.current = { draw, resize };

    const ro = new ResizeObserver(() => {
      resize();
    });

    // continuous render loop for smooth advance
    let raf = 0;
    const loop = () => {
      try {
        draw();
      } catch {
        // ignore
      }
      raf = requestAnimationFrame(loop);
    };

    resize();
    loop();

    ro.observe(canvas.parentElement ?? canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      stateRef.current = null;
      rangeRef.current = null;
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />;
}
