import React, { useEffect, useMemo, useRef } from "react";
import { createChart, ColorType, ISeriesApi, LineData, Time } from "lightweight-charts";

type Props = {
  data: Array<{ t: number; price: number }>;
  height?: number;
};

function toTime(ms: number): Time {
  return Math.floor(ms / 1000) as Time;
}

export const TradingViewLikeChart: React.FC<Props> = ({ data, height = 420 }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const lineData: LineData[] = useMemo(() => data.map(d => ({ time: toTime(d.t), value: d.price })), [data]);

  useEffect(() => {
    if (!ref.current) return;

    const chart = createChart(ref.current, {
      height,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#C9D1D9" },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: true }
    });

    const series = chart.addLineSeries({ lineWidth: 2, priceLineVisible: true });
    seriesRef.current = series;
    series.setData(lineData);

    const ro = new ResizeObserver(() => chart.applyOptions({ width: ref.current!.clientWidth }));
    ro.observe(ref.current);

    return () => { ro.disconnect(); chart.remove(); };
  }, []);

  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.setData(lineData);
  }, [lineData]);

  return <div ref={ref} style={{ width: "100%" }} />;
};
