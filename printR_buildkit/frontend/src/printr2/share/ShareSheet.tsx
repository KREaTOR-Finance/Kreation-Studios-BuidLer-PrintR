import React, { useMemo, useState } from "react";
import { Button, Panel } from "../ui";

function sessionUrl(sessionId: string): string {
  // HashRouter-safe deep link
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/#/session/${sessionId}`;
}

export function ShareSheet(props: { sessionId: string; onClose: () => void }){
  const url = useMemo(() => sessionUrl(props.sessionId), [props.sessionId]);
  const [copied, setCopied] = useState(false);

  const text = `Join my PrintR session: ${url}`;

  const nativeShare = async () => {
    const nav: any = navigator as any;
    if (!nav?.share) return false;
    try {
      await nav.share({ title: "PrintR", text, url });
      return true;
    } catch {
      return false;
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {
      // fallback prompt
      window.prompt("Copy this link:", url);
    }
  };

  const open = (u: string) => {
    window.open(u, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="p2-modalBack" role="dialog" aria-modal="true">
      <Panel className="p2-modal" as="div">
        <div className="p2-modalHeader">
          <div className="p2-modalTitle">Share Session</div>
          <Button variant="ghost" onClick={props.onClose}>Close</Button>
        </div>

        <div className="p2-proof" style={{ marginTop: 10 }}>
          <div className="p2-mini">LINK</div>
          <div className="p2-proofMono">{url}</div>
        </div>

        <div className="p2-ctaRow" style={{ marginTop: 12, flexWrap: "wrap" }}>
          <Button onClick={async () => { const ok = await nativeShare(); if (!ok) await copy(); }}>{copied ? "COPIED" : "SHARE"}</Button>
          <Button variant="secondary" onClick={copy}>COPY LINK</Button>
          <Button variant="secondary" onClick={() => open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent("PrintR session")}`)}>TELEGRAM</Button>
          <Button variant="secondary" onClick={() => open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`)}>X</Button>
        </div>
      </Panel>
    </div>
  );
}
