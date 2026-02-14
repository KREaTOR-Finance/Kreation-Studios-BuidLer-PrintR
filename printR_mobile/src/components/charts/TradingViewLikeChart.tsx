import React, { useRef, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";

type TickData = {
  t: number;
  price: number;
  tickIndex?: number;
};

type CandleData = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type Props = {
  data: TickData[];
  height?: number;
};

function ticksToCandles(ticks: TickData[]): CandleData[] {
  if (!ticks || ticks.length === 0) return [];

  const candleMap = new Map<number, CandleData>();
  const order: number[] = [];
  let prevClose = ticks[0].price;

  for (const tick of ticks) {
    const time = Math.floor(tick.t / 1000);
    const open = prevClose;
    const close = tick.price;
    const high = Math.max(open, close);
    const low = Math.min(open, close);

    const existing = candleMap.get(time);
    if (existing) {
      existing.close = close;
      existing.high = Math.max(existing.high, high);
      existing.low = Math.min(existing.low, low);
    } else {
      candleMap.set(time, { time, open, high, low, close });
      order.push(time);
    }

    prevClose = close;
  }

  return order.map((t) => candleMap.get(t)!);
}

const chartHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; }
    #chart { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="chart"></div>
  <script src="https://unpkg.com/lightweight-charts@4.2.3/dist/lightweight-charts.standalone.production.js"></script>
  <script>
    var chart = LightweightCharts.createChart(document.getElementById('chart'), {
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#C9D1D9',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
      },
      rightPriceScale: {
        borderVisible: false,
      },
      crosshair: {
        mode: 0,
      },
    });

    var candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    window.updateChart = function(jsonData) {
      try {
        var data = JSON.parse(jsonData);
        if (data && data.length > 0) {
          candleSeries.setData(data);
          chart.timeScale().fitContent();
        }
      } catch (e) {}
    };

    chart.timeScale().fitContent();
  </script>
</body>
</html>
`;

function WebChart({ candles, height }: { candles: CandleData[]; height: number }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current?.contentWindow && candles.length > 0) {
      const json = JSON.stringify(candles);
      const escaped = json.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      iframeRef.current.contentWindow.postMessage({ type: "updateChart", data: escaped }, "*");
    }
  }, [candles]);

  const html = chartHTML.replace(
    "chart.timeScale().fitContent();\n  </script>",
    `chart.timeScale().fitContent();
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'updateChart') window.updateChart(e.data.data);
    });
  </script>`
  );

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      style={{ width: "100%", height, border: "none", backgroundColor: "transparent" }}
      onLoad={() => {
        if (iframeRef.current?.contentWindow && candles.length > 0) {
          const json = JSON.stringify(candles);
          const escaped = json.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
          iframeRef.current.contentWindow.postMessage({ type: "updateChart", data: escaped }, "*");
        }
      }}
    />
  );
}

function NativeChart({ candles, height }: { candles: CandleData[]; height: number }) {
  const { WebView } = require("react-native-webview");
  const webviewRef = useRef<any>(null);

  useEffect(() => {
    if (webviewRef.current && candles.length > 0) {
      const json = JSON.stringify(candles);
      const escaped = json.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      webviewRef.current.injectJavaScript(
        `window.updateChart('${escaped}'); true;`
      );
    }
  }, [candles]);

  return (
    <WebView
      ref={webviewRef}
      source={{ html: chartHTML }}
      scrollEnabled={false}
      style={{ backgroundColor: "transparent" }}
      originWhitelist={["*"]}
      javaScriptEnabled={true}
      onLoadEnd={() => {
        if (candles.length > 0) {
          const json = JSON.stringify(candles);
          const escaped = json.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
          webviewRef.current?.injectJavaScript(
            `window.updateChart('${escaped}'); true;`
          );
        }
      }}
    />
  );
}

export default function TradingViewLikeChart({ data, height = 260 }: Props) {
  const candles = useMemo(() => ticksToCandles(data), [data]);

  return (
    <View style={[styles.container, { height }]}>
      {Platform.OS === "web" ? (
        <WebChart candles={candles} height={height} />
      ) : (
        <NativeChart candles={candles} height={height} />
      )}
      <Text style={styles.watermark}>BP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
    borderRadius: 8,
  },
  watermark: {
    position: "absolute",
    bottom: 8,
    left: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255,255,255,0.12)",
    letterSpacing: 2,
  },
});
