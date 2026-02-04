# Admin — Review Developer Leads (without Supabase UI)

## Configure
Set in backend env:
- `ADMIN_TOKEN=<your-secret>`

## Request
```bash
curl -s "http://localhost:3001/api/admin/developer-leads?limit=50&offset=0" \
  -H "X-Admin-Token: $ADMIN_TOKEN" | jq
```

## Pagination
- Increase `offset` to page:
```bash
curl -s "http://localhost:3001/api/admin/developer-leads?limit=50&offset=50" \
  -H "X-Admin-Token: $ADMIN_TOKEN"
```
