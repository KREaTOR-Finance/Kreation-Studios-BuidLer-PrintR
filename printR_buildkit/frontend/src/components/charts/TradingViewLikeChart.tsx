import React, { useEffect, useMemo, useRef } from "react";
import { createChart, ColorType, ISeriesApi, CandlestickData, Time } from "lightweight-charts";

type Props = {
  data: Array<{ t: number; price: number; tickIndex?: number }>;
  height?: number;
};

function toTime(ms: number): Time {
  return Math.floor(ms / 1000) as Time;
}

export const TradingViewLikeChart: React.FC<Props> = ({ data, height = 420 }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const candleData: CandlestickData[] = useMemo(() => {
    if (!data.length) return [];
    const out: CandlestickData[] = [];
    let prevClose = data[0].price;
    let lastTime: Time | null = null;
    for (let i = 0; i < data.length; i++) {
      const time = toTime(data[i].t);
      const close = data[i].price;
      if (lastTime !== null && time === lastTime) {
        const prev = out[out.length - 1];
        const high = Math.max(prev.high, close);
        const low = Math.min(prev.low, close);
        out[out.length - 1] = { ...prev, time, high, low, close };
        prevClose = close;
        continue;
      }
      const open = i === 0 ? close : prevClose;
      const high = Math.max(open, close);
      const low = Math.min(open, close);
      out.push({
        time,
        open,
        high,
        low,
        close
      });
      lastTime = time;
      prevClose = close;
    }
    return out;
  }, [data]);

  useEffect(() => {
    if (!ref.current) return;

    const chart = createChart(ref.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#C9D1D9",
        attributionLogo: false
      },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: true }
    });

    const series = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      borderVisible: false
    });
    seriesRef.current = series;
    series.setData(candleData);

    const ro = new ResizeObserver(() => chart.applyOptions({ width: ref.current!.clientWidth }));
    ro.observe(ref.current);

    return () => { ro.disconnect(); chart.remove(); };
  }, []);

  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.setData(candleData);
  }, [candleData]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div ref={ref} style={{ width: "100%" }} />
      <div
        style={{
          position: "absolute",
          left: 10,
          bottom: 8,
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: 1.2,
          color: "rgba(226,232,240,0.75)",
          pointerEvents: "none"
        }}
      >
        BP
      </div>
    </div>
  );
};
