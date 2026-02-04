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
      setTimeout(onComplete, 300); // Wait for fade animation
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
        background: "var(--bg-midnight, #0B1020)",
        zIndex: 9999,
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 300ms ease-out",
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontSize: 64,
          fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
          fontWeight: 900,
          letterSpacing: 4,
          background: "linear-gradient(135deg, var(--primary-blue, #3B82F6), var(--primary-purple, #8B5CF6))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        PrintR
      </div>

      {/* Tagline */}
      <div
        style={{
          marginTop: 12,
          fontSize: 14,
          color: "rgba(255,255,255,0.6)",
          letterSpacing: 1,
        }}
      >
        by Kreation Studios
      </div>

      {/* Loading indicator */}
      <div
        style={{
          marginTop: 40,
          width: 32,
          height: 32,
          border: "3px solid rgba(255,255,255,0.1)",
          borderTopColor: "var(--primary-blue, #3B82F6)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
