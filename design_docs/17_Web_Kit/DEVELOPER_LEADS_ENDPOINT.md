# Developer Leads (Submit Your Game) — Backend + DB

## Endpoint
`POST /api/developer-leads`

### Request JSON
```json
{
  "name": "Jane Builder",
  "email": "jane@studio.com",
  "studio": "Studio Name (optional)",
  "gameTitle": "My Game",
  "gameLink": "https://playable-link (optional)",
  "pitch": "20+ characters pitch required",
  "stack": "React/Unity/etc (optional)",
  "socials": "X/Telegram/Website (optional)",
  "notes": "optional",
  "company": "" // honeypot; must remain empty
}
```

### Response
```json
{ "ok": true, "leadId": "..." }
```

## Storage strategy
`backend/src/developers/leadsStore.ts` chooses persistence:
1) If `DATABASE_URL` is set → Postgres (Supabase compatible)
2) Else if `DEVELOPER_LEADS_DB_PATH` or `DATABASE_PATH` set → SQLite
3) Else → in-memory (dev only)

## Migration (Supabase)
Apply:
- `printR_buildkit/backend/migrations/2026_01_04_create_developer_leads.sql`

## Notes
- Endpoint is public (no auth) to allow developers to submit from the website.
- Optional header `X-Player-Ref` is accepted if you want to correlate submissions with Telegram/web identity.


## Admin endpoint (list leads)
`GET /api/admin/developer-leads?limit=50&offset=0`

Headers:
- `X-Admin-Token: <ADMIN_TOKEN>`

Response:
```json
{ "ok": true, "leads": [...], "total": 123, "limit": 50, "offset": 0 }
```

Notes:
- Set `ADMIN_TOKEN` in backend environment.
- Keep this token server-side only.
