export type DeveloperLeadPayload = {
  name: string;
  email: string;
  studio?: string;
  gameTitle: string;
  gameLink?: string;
  pitch: string;
  stack?: string;
  socials?: string;
  notes?: string;
  // honeypot field:
  company?: string;
};

function apiBase() {
  return import.meta.env.VITE_API_BASE || "";
}

export async function submitDeveloperLead(payload: DeveloperLeadPayload, playerRef?: string) {
  const res = await fetch(`${apiBase()}/api/developer-leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(playerRef ? { "X-Player-Ref": playerRef } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(()=> ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "SUBMIT_FAILED");
  }
  return data as { ok: true; leadId: string };
}
