import React, { useMemo, useState } from "react";
import { Section, CTA, FAQ } from "../components/site/SiteComponents";
import { submitDeveloperLead, type DeveloperLeadPayload } from "../network/developerLeads";
import { useHost } from "../hooks/useHost";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; leadId: string }
  | { kind: "error"; message: string };

export default function DevelopersPage() {
  const { playerRef } = useHost();

  const [form, setForm] = useState<DeveloperLeadPayload>({
    name: "",
    email: "",
    studio: "",
    gameTitle: "",
    gameLink: "",
    pitch: "",
    stack: "",
    socials: "",
    notes: "",
    company: "" // honeypot (should remain empty)
  });

  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const canSubmit = useMemo(() => {
    return form.name.trim().length >= 2
      && form.email.trim().length >= 5
      && form.gameTitle.trim().length >= 2
      && form.pitch.trim().length >= 20
      && form.company?.trim().length === 0;
  }, [form]);

  async function onSubmit(e: React.FormEvent){
    e.preventDefault();
    if (!canSubmit) return;
    setStatus({ kind: "submitting" });
    try {
      const r = await submitDeveloperLead({
        name: form.name.trim(),
        email: form.email.trim(),
        studio: form.studio?.trim() || undefined,
        gameTitle: form.gameTitle.trim(),
        gameLink: form.gameLink?.trim() || undefined,
        pitch: form.pitch.trim(),
        stack: form.stack?.trim() || undefined,
        socials: form.socials?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
        company: form.company ?? ""
      }, playerRef);
      setStatus({ kind: "success", leadId: r.leadId });
    } catch (err: any) {
      setStatus({ kind: "error", message: err?.message ?? "SUBMIT_FAILED" });
    }
  }

  return (
    <div className="container">
      <div className="h2">Developers</div>
      <div className="small" style={{ marginTop: 6, maxWidth: 980 }}>
        Kreation Studios Games is opening a limited number of featured slots for high-quality, mobile-first games.
        Early on, we’re curating by conversation — the fastest way in is to submit your build and pitch below.
      </div>

      <Section title="Submit your game (Developer Leads)">
        <div className="panel">
          {status.kind === "success" ? (
            <div>
              <div style={{ fontWeight: 1000 }}>Submitted ✅</div>
              <div className="small" style={{ marginTop: 6 }}>
                We received your submission. Lead ID: <b>{status.leadId}</b>
              </div>
              <div className="small" style={{ marginTop: 10 }}>
                If you included a playable link, we’ll review it first. If we need anything else, we’ll reach out.
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))" }}>
                <Field label="Your name" value={form.name} onChange={(v)=>setForm(s=>({ ...s, name:v }))} placeholder="Jane Builder" />
                <Field label="Email" value={form.email} onChange={(v)=>setForm(s=>({ ...s, email:v }))} placeholder="jane@studio.com" />
                <Field label="Studio / Team (optional)" value={form.studio ?? ""} onChange={(v)=>setForm(s=>({ ...s, studio:v }))} placeholder="Studio Name" />
                <Field label="Game title" value={form.gameTitle} onChange={(v)=>setForm(s=>({ ...s, gameTitle:v }))} placeholder="My Game" />
                <Field label="Playable link (optional)" value={form.gameLink ?? ""} onChange={(v)=>setForm(s=>({ ...s, gameLink:v }))} placeholder="https://..." />
                <Field label="Tech stack (optional)" value={form.stack ?? ""} onChange={(v)=>setForm(s=>({ ...s, stack:v }))} placeholder="React, Unity, etc." />
                <Field label="Socials (optional)" value={form.socials ?? ""} onChange={(v)=>setForm(s=>({ ...s, socials:v }))} placeholder="X / Telegram / website" />
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={{ display:"block", fontWeight: 900, marginBottom: 6 }}>Pitch (20+ chars)</label>
                <textarea
                  value={form.pitch}
                  onChange={(e)=>setForm(s=>({ ...s, pitch:e.target.value }))}
                  placeholder="Tell us what the game is, why it’s fun, and why it fits Kreation Studios."
                  style={{ width:"100%", minHeight: 120, borderRadius: 14, border:"1px solid var(--border)", background:"rgba(0,0,0,0.25)", color:"var(--text)", padding: 12, outline:"none" }}
                />
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={{ display:"block", fontWeight: 900, marginBottom: 6 }}>Notes (optional)</label>
                <textarea
                  value={form.notes ?? ""}
                  onChange={(e)=>setForm(s=>({ ...s, notes:e.target.value }))}
                  placeholder="Anything else we should know? Monetization model, launch timeline, etc."
                  style={{ width:"100%", minHeight: 90, borderRadius: 14, border:"1px solid var(--border)", background:"rgba(0,0,0,0.25)", color:"var(--text)", padding: 12, outline:"none" }}
                />
              </div>

              {/* Honeypot field (hidden to humans) */}
              <input
                type="text"
                value={form.company ?? ""}
                onChange={(e)=>setForm(s=>({ ...s, company:e.target.value }))}
                style={{ display:"none" }}
                tabIndex={-1}
                autoComplete="off"
              />

              <div style={{ marginTop: 14, display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
                <button
                  type="submit"
                  className={"btn btnPrimary"}
                  disabled={!canSubmit || status.kind==="submitting"}
                  style={{ opacity: (!canSubmit || status.kind==="submitting") ? 0.6 : 1, cursor: (!canSubmit || status.kind==="submitting") ? "not-allowed" : "pointer" }}
                >
                  {status.kind==="submitting" ? "Submitting…" : "Submit Game"}
                </button>

                {status.kind === "error" ? (
                  <span className="small">Error: <b>{status.message}</b></span>
                ) : (
                  <span className="small">This creates a developer lead in our backend (no email required).</span>
                )}
              </div>
            </form>
          )}
        </div>
      </Section>

      <Section title="Featured Game Slots (Paid — limited)">
        <div className="panel">
          <div style={{ fontWeight: 1000 }}>What you get</div>
          <ul className="small" style={{ marginTop: 8, lineHeight: 1.7 }}>
            <li>Placement in the Games catalog + home page featured area (slot-based).</li>
            <li>Brand-aligned landing page template (Kreation Studios look & feel).</li>
            <li>Optional Telegram funnel support (Mini App wrapper approach).</li>
            <li>Launch checklist + quality bar review (performance, UX, retention loop clarity).</li>
          </ul>
          <div className="hr" />
          <div className="small">
            Contact: <b>dev@kreationstudios.games</b> (backup placeholder) • Telegram: <b>@KreationStudios</b> (placeholder)
          </div>
        </div>
      </Section>

      <Section title="Quality bar">
        <FAQ items={[
          { q:"What kinds of games fit?", a:<>Fast, skill-based, mobile-first games with clear loops, strong UX, and no sketchy monetization.</> },
          { q:"Do we need Web3?", a:<>No. Web3 is optional. If used, it must be trust-first and user-safe.</> },
          { q:"What does “paid slot” mean?", a:<>A limited featured placement on the Kreation Studios Games website. Pricing is discussed after review.</> },
        ]}/>
      </Section>

      <CTA
        title="Want a slot?"
        body={<>Submit above and we’ll review. Early partners get priority placement as the catalog grows.</>}
        primaryTo="/games"
        primaryText="View Games"
        secondaryTo="/printr"
        secondaryText="Play PrintR"
      />
    </div>
  );
}

function Field({ label, value, onChange, placeholder }:{
  label: string; value: string; onChange:(v:string)=>void; placeholder?: string;
}) {
  return (
    <div>
      <label style={{ display:"block", fontWeight: 900, marginBottom: 6 }}>{label}</label>
      <input
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width:"100%", borderRadius: 14, border:"1px solid var(--border)", background:"rgba(0,0,0,0.25)", color:"var(--text)", padding: 12, outline:"none" }}
      />
    </div>
  );
}
