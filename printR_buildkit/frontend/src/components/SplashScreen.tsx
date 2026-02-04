import React, { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
  minDisplayMs?: number;
}

export function SplashScreen({ onComplete, minDisplayMs = 1500 }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 300);
    }, minDisplayMs);

    return () => clearTimeout(timer);
  }, [onComplete, minDisplayMs]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%)",
        zIndex: 9999,
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 300ms ease-out",
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontSize: 72,
          fontFamily: "monospace",
          fontWeight: 900,
          letterSpacing: 6,
          background: "linear-gradient(90deg, #4ECDC4 0%, #7B68EE 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          textShadow: "0 0 40px rgba(78, 205, 196, 0.3)",
        }}
      >
        PrintR
      </div>

      {/* Tagline */}
      <div
        style={{
          marginTop: 16,
          fontSize: 14,
          color: "rgba(255,255,255,0.5)",
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        Kreation Studios
      </div>

      {/* Pixel loading bar */}
      <div
        style={{
          marginTop: 48,
          width: 120,
          height: 8,
          background: "rgba(255,255,255,0.1)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(90deg, #4ECDC4, #7B68EE, #FF6B9D)",
            animation: "loading 1.5s ease-in-out infinite",
            transformOrigin: "left",
          }}
        />
      </div>

      {/* Decorative pixels */}
      <div style={{ position: "absolute", top: 60, left: 60 }}>
        <div style={{ width: 8, height: 8, background: "#4ECDC4", opacity: 0.6 }} />
      </div>
      <div style={{ position: "absolute", top: 100, right: 80 }}>
        <div style={{ width: 12, height: 12, background: "#7B68EE", opacity: 0.5 }} />
      </div>
      <div style={{ position: "absolute", bottom: 120, left: 100 }}>
        <div style={{ width: 10, height: 10, background: "#FF6B9D", opacity: 0.7 }} />
      </div>
      <div style={{ position: "absolute", bottom: 80, right: 60 }}>
        <div style={{ width: 8, height: 8, background: "#FFD700", opacity: 0.6 }} />
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: scaleX(0); }
          50% { transform: scaleX(1); }
          100% { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}
