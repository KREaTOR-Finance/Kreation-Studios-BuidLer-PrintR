import React from "react";
import { Section } from "../components/site/SiteComponents";

export default function LegalPage() {
  return (
    <div className="container">
      <div className="h2">Legal</div>
      <div className="small" style={{ marginTop: 6, maxWidth: 980 }}>
        Placeholder legal content. Replace with finalized Terms and Privacy before launch.
      </div>

      <Section title="Terms (placeholder)">
        <div className="panel">
          <div className="small">
            PrintR is an arcade-style points game. Purchases provide session access. No cash-out functionality is provided by default.
            Rules, pricing, and availability may change.
          </div>
        </div>
      </Section>

      <Section title="Privacy (placeholder)">
        <div className="panel">
          <div className="small">
            We may store a Telegram user ID (or web guest ID), gameplay stats, and purchase receipts for account functionality and fraud prevention.
          </div>
        </div>
      </Section>
    </div>
  );
}
