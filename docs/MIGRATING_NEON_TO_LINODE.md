# Migrating a Neon DB to the Linode Postgres VM

> **Reference for Claude Code / LLM agents.** This is a tested playbook from the
> 2026-05-06 sewerreport migration. Six other Neon databases (same Neon account)
> are queued for the same move. Read top-to-bottom before running anything; the
> ordering is load-bearing.

## TL;DR — what this does

Moves a Postgres database off Neon (PG 17.x serverless) and onto the shared
Linode VM at **`172.233.154.220`** which runs **PG 16** behind **PgBouncer**
(transaction pool mode, port `6432`). The VM already hosts multiple customer
databases — the migration is *strictly additive*: a new role + a new database
are created, nothing existing is touched.

## Critical safety constraints

The Linode VM is multi-tenant. As of 2026-05-06 it hosts at least:

| Database | Owner role | Notes |
|---|---|---|
| `belizerealestate` | `belizerealestate` | external direct access in pg_hba |
| `buxvenues_contracts` | `buxvenues` | PgBouncer only |
| `forsalespokane_listings` | `forsalespokane` | ~11 GB, biggest tenant |
| `pruuf_db` | `pruuf_user` | direct only, NOT in PgBouncer |
| `sewerreport` | `sewerreport_app` | added 2026-05-06 |

**Hard rules:**

1. Never run unscoped commands (e.g. `\c` followed by destructive SQL, broad
   `pg_dumpall`, `REASSIGN OWNED BY postgres TO ...` on shared schemas).
2. Never `restart` PgBouncer or Postgres — only `reload`. Reload preserves
   existing pooled sessions for other tenants. Restart drops every other
   tenant's connections.
3. Never read `/etc/pgbouncer/userlist.txt` to copy/inspect another tenant's
   credential hash. Use append-only operations (write your own line via
   `pg_authid` query → `tee -a`).
4. Always back up `pgbouncer.ini` and `userlist.txt` before any change:
   `sudo cp /etc/pgbouncer/userlist.txt /etc/pgbouncer/userlist.txt.bak.$(date +%s)`
5. Watch `journalctl -u pgbouncer --since "30 seconds ago"` after every reload.
   `broken auth file` means you malformed the userlist — restore from backup
   immediately.

## Server access

```bash
ssh root@172.233.154.220        # SSH key already in ~/.ssh/, host in known_hosts
# Postgres data dir:  /var/lib/postgresql/16/main
# Postgres config:    /etc/postgresql/16/main/{postgresql.conf,pg_hba.conf}
# PgBouncer config:   /etc/pgbouncer/{pgbouncer.ini,userlist.txt}
# Migration scratch:  /root/sewerreport-migration/  (use a per-project subdir)
```

PgBouncer config (current):
- `auth_type = scram-sha-256`, `auth_file = /etc/pgbouncer/userlist.txt`
- `pool_mode = transaction`
- `listen_addr = *`, `listen_port = 6432`
- DB entries are: `<dbname> = host=127.0.0.1 port=5432 dbname=<dbname>` under `[databases]`

## The version mismatch problem (read first)

**Neon runs PG 17.x. Linode runs PG 16.** Postgres dumps are version-strict:

- `pg_dump` from a newer client *cannot* dump from an older server (it aborts).
- `pg_dump 16` *cannot* dump from a PG 17 server (also aborts — strict check).
- `pg_restore` of a PG 17 dump into PG 16 is **not officially supported**.

The workable path that's been validated end-to-end:

1. Dump from Neon with `pg_dump 17.x` in **plain SQL** format (`-Fp`, not custom
   `-Fc`) — plain SQL is portable across versions for vanilla schemas.
2. **Sanitize** the SQL to strip PG17-only directives (see below).
3. Load with `psql 16` on the Linode in a **single transaction**.

Vanilla here means: the schema uses only standard PG types (text, jsonb, int,
timestamp, fk constraints, indexes). If you have extensions beyond `plpgsql`,
or use PG17-only features (e.g. `MERGE ... RETURNING`, `JSON_TABLE`, the new
collation provider, `system_user`), this playbook is not enough — stop and
get human review.

Quick check (run from your local machine):
```bash
psql "$NEON_URL" -At -c "SELECT extname FROM pg_extension ORDER BY 1"
# Should output only: plpgsql
```

## What to sanitize out of a PG17 plain-SQL dump

These are the exact byte patterns PG 16 rejects (verified from sewerreport):

| Pattern | Why | Fix |
|---|---|---|
| `\restrict <token>` | psql 17 metacommand for security | Drop the line |
| `\unrestrict <token>` | matching close | Drop the line |
| `SET transaction_timeout = 0;` | PG17-only GUC | Drop the line |
| `ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin ... TO neon_superuser ...` | Neon-internal roles that don't exist anywhere else | Drop the line (and the comment header above it) |
| `OWNER TO neondb_owner` | Neon's source role doesn't exist on Linode | Rewrite to `OWNER TO <new_app_role>` |
| `GRANT/REVOKE ... TO/FROM neondb_owner` | Same | Rewrite |

Sanitizer (run on the Linode after `scp`-ing the dump):

```bash
# /root/<project>-migration/sanitize.py
cat > /tmp/sanitize.py <<'PYEOF'
src = "/root/<project>-migration/neondb.sql"
dst = "/root/<project>-migration/neondb-pg16.sql"
NEW_ROLE = "<your_new_app_role>"   # e.g. sewerreport_app
prefixes = (r"\restrict ", r"\unrestrict ", "SET transaction_timeout")
removed, subs = [], 0
with open(src) as i, open(dst, "w") as o:
    for n, line in enumerate(i, 1):
        s = line.rstrip("\n")
        if any(s.startswith(p) for p in prefixes):
            removed.append((n, "PG17-only", s[:70])); continue
        if "cloud_admin" in line or "neon_superuser" in line:
            removed.append((n, "Neon-internal", s[:70])); continue
        if "neondb_owner" in line:
            subs += line.count("neondb_owner")
            line = line.replace("neondb_owner", NEW_ROLE)
        o.write(line)
print(f"Lines removed: {len(removed)}")
for n, k, t in removed: print(f"  {n} [{k}]: {t!r}")
print(f"neondb_owner -> {NEW_ROLE} substitutions: {subs}")
PYEOF
python3 /tmp/sanitize.py
# Verify sanitization caught everything
grep -c "neondb_owner\|cloud_admin\|neon_superuser\|^\\\\(un)?restrict\|^SET transaction_timeout" /root/<project>-migration/neondb-pg16.sql
# Should print 0
```

## Step-by-step migration

### 0. Pre-flight (LOCAL machine, before touching any servers)

```bash
# Confirm the project's Prisma schema only reads DATABASE_URL (no directUrl yet)
grep -n "url\s*=\s*env" prisma/schema.prisma  # expect: url = env("DATABASE_URL")

# Confirm the local working tree is clean OR you've decided what's shipping
git status --short

# Take a fresh PG17 backup of Neon as a parachute (NOT used for the actual
# migration — the migration uses a dump taken on the Linode).
# pg_dump 17.x lives at C:\Program Files\PostgreSQL\17\bin\pg_dump.exe on Windows,
# install via:  winget install PostgreSQL.PostgreSQL.17
DATE=$(date +%Y%m%d-%H%M%S)
"$PG17/pg_dump" -Fc -d "$NEON_UNPOOLED_URL" -f "/c/Users/theri/Desktop/<project>-PRE-MIGRATION-$DATE.dump"
"$PG17/pg_dump" -Fp -d "$NEON_UNPOOLED_URL" -f "/c/Users/theri/Desktop/<project>-PRE-MIGRATION-$DATE.sql"
# Snapshot row counts so the post-migration parity check is meaningful:
"$PG17/psql"   -d "$NEON_UNPOOLED_URL" -A -F "," -t -c "
  SELECT format('%I', tablename),
         (xpath('/row/c/text()',
                query_to_xml(format('SELECT COUNT(*) AS c FROM public.%I', tablename),
                             true, true, '')))[1]::text::bigint
  FROM pg_tables WHERE schemaname='public' ORDER BY 1;
" > "/c/Users/theri/Desktop/<project>-PRE-MIGRATION-$DATE.rowcounts.csv"
```

**Always use the UNPOOLED Neon connection string** (the one without `-pooler` in
the host) for `pg_dump`. PgBouncer-pooled connections break long-running dumps.

### 1. SSH discovery (READ-ONLY)

```bash
ssh root@172.233.154.220 'pg_lsclusters; df -h /; sudo -u postgres psql -At -c "SELECT datname FROM pg_database WHERE datistemplate=false ORDER BY 1"; sudo -u postgres psql -At -c "SELECT rolname FROM pg_roles WHERE rolname NOT LIKE '"'"'pg_%'"'"' ORDER BY 1"'
```

Confirm:
- `pg_lsclusters` shows PG 16 cluster on port 5432
- Disk has plenty of free space (>= 5× the dump size as buffer)
- Your intended new DB name and role name are NOT in the existing lists

### 2. Pick names

Convention from existing tenants: use the project name as the DB name and
`<project>_app` (or `<project>_owner`) as the role name. **Avoid** reusing
existing role names — explicitly check.

Generate a strong password locally (alphanumeric only, 32 chars, no special
chars to dodge any future quoting hell):

```powershell
# Windows PowerShell:
$pw = -join ((1..32) | ForEach-Object { [char[]](48..57 + 65..90 + 97..122) | Get-Random })
$pw | Out-File -FilePath "C:\Users\theri\Desktop\<project>-db-password.txt" -Encoding ASCII -NoNewline
$pw   # display once, save it
```

### 3. Take the dump (FROM the Linode, USING pg_dump 17 against Neon)

`pg_dump 16` refuses to talk to a PG 17 server, and the Linode only ships PG 16
client tools. Two paths:

**(A, validated):** Take the dump *locally* with `pg_dump 17`, scp the plain
SQL up to the Linode, sanitize it there, load with `psql 16`. This is what the
sewerreport migration did. Below is the validated A path.

```bash
# LOCAL: pg_dump 17 plain SQL against Neon UNPOOLED endpoint
"$PG17/pg_dump" -Fp -d "$NEON_UNPOOLED_URL" -f "$LOCAL/<project>-neon.sql"

# scp to Linode
ssh root@172.233.154.220 "mkdir -p /root/<project>-migration"
scp "$LOCAL/<project>-neon.sql" root@172.233.154.220:/root/<project>-migration/neondb.sql

# Sanitize on the Linode (use the python block above, with NEW_ROLE filled in)
ssh root@172.233.154.220 "python3 /tmp/sanitize.py"
```

**(B, alternative if A blows up):** Add the official PostgreSQL APT repo to
the Linode and `apt install postgresql-client-17` for client tools only (no
server). Then `pg_dump 17` runs on the Linode itself. Costs an extra system
package on the shared host — only do this with explicit user approval.

### 4. Create the role and database

Connect as the `postgres` superuser via local socket (peer auth, no password):

```bash
ssh root@172.233.154.220 'sudo -u postgres psql -v ON_ERROR_STOP=1 <<EOF
CREATE ROLE <new_role> WITH LOGIN PASSWORD '"'"'<paste-password>'"'"' NOINHERIT;
CREATE DATABASE <new_db> OWNER <new_role> ENCODING '"'"'UTF8'"'"' TEMPLATE template0;
EOF'
```

Verify the new objects exist AND nothing else changed:
```bash
ssh root@172.233.154.220 'sudo -u postgres psql -At -c "SELECT datname FROM pg_database WHERE datistemplate=false ORDER BY 1"; echo "---"; sudo -u postgres psql -At -c "SELECT rolname FROM pg_roles WHERE rolname NOT LIKE '"'"'pg_%'"'"' ORDER BY 1"'
```

### 5. Load the sanitized SQL (atomic, single-transaction)

Connect via TCP on `127.0.0.1:5432` *as the new role* so every loaded object
is owned by it from creation:

```bash
ssh root@172.233.154.220 'PGPASSWORD="<paste-password>" psql -h 127.0.0.1 -U <new_role> -d <new_db> --single-transaction --set ON_ERROR_STOP=1 -f /root/<project>-migration/neondb-pg16.sql 2>&1 | tail -25'
# Expect: ALTER TABLE / CREATE INDEX / etc. final lines, exit 0, no ERROR lines.
# If ANY line errors, --single-transaction rolls back everything — fix and retry.
```

The first failed sewerreport load surfaced two more lines to add to the
sanitizer (`cloud_admin` / `neon_superuser` ACLs). If your dump errors with
"role X does not exist," add another `if "X" in line: continue` arm to the
sanitizer and retry — the rollback leaves a clean DB.

### 6. Parity check

```bash
# Linode count
ssh root@172.233.154.220 "sudo -u postgres psql -d <new_db> -At -F ',' -c \"
SELECT format('%I', tablename),
       (xpath('/row/c/text()', query_to_xml(format('SELECT COUNT(*) AS c FROM public.%I', tablename), true, true, '')))[1]::text::bigint
FROM pg_tables WHERE schemaname='public' ORDER BY 1;
\""
```
Diff that against the row-count CSV from step 0. **Every row must match
exactly.** If anything differs, the load was incomplete — investigate before
proceeding (do not paper over).

Also sanity-check structural objects:
```sql
SELECT 'idx', COUNT(*) FROM pg_indexes WHERE schemaname='public'
UNION ALL SELECT 'tab', COUNT(*) FROM pg_tables WHERE schemaname='public'
UNION ALL SELECT 'seq', COUNT(*) FROM pg_sequences WHERE schemaname='public'
UNION ALL SELECT 'fk',  COUNT(*) FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace;
```
Compare to Neon. Counts should match.

### 7. Wire up PgBouncer

The new DB needs entries in *both* PgBouncer config files. Always back up first.

```bash
ssh root@172.233.154.220 'set -e
TS=$(date +%Y%m%d-%H%M%S)
sudo cp /etc/pgbouncer/pgbouncer.ini /etc/pgbouncer/pgbouncer.ini.bak.$TS
sudo cp /etc/pgbouncer/userlist.txt  /etc/pgbouncer/userlist.txt.bak.$TS

# Insert the new DB line BEFORE the [pgbouncer] section in pgbouncer.ini:
sudo sed -i "/^\[pgbouncer\]/i <new_db> = host=127.0.0.1 port=5432 dbname=<new_db>" /etc/pgbouncer/pgbouncer.ini

# Append the user line to userlist.txt — query the SCRAM verifier from
# pg_authid via heredoc to dodge shell-escape issues. Hash never enters
# your terminal scrollback.
cat > /tmp/add-pgb.sh <<"OUTER"
#!/bin/bash
set -e
ROLE="<new_role>"
HASH=$(sudo -u postgres psql -At <<INNER
SELECT rolpassword FROM pg_authid WHERE rolname='"'"'<new_role>'"'"';
INNER
)
[ -z "$HASH" ] && { echo "no hash"; exit 1; }
printf "\"%s\" \"%s\"\n" "$ROLE" "$HASH" | sudo tee -a /etc/pgbouncer/userlist.txt > /dev/null
OUTER
chmod +x /tmp/add-pgb.sh
/tmp/add-pgb.sh

# Reload (NEVER restart). Watch logs for "broken auth file".
sudo systemctl reload pgbouncer
sleep 1
sudo journalctl -u pgbouncer --since "30 seconds ago" --no-pager | tail -10'
```

If `journalctl` shows `broken auth file`:
```bash
ssh root@172.233.154.220 'LATEST=$(sudo ls -t /etc/pgbouncer/userlist.txt.bak.* | head -1); sudo cp "$LATEST" /etc/pgbouncer/userlist.txt; sudo systemctl reload pgbouncer'
```
Then debug the userlist line format and try again. The append-only script
above worked first try when properly heredoc'd; the earlier inline-quoted
versions did not.

### 8. End-to-end smoke from your dev machine

```powershell
# Windows PowerShell — uses pg_dump 17's psql since PgBouncer talks PG protocol
$env:PGPASSWORD = "<paste-password>"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -h 172.233.154.220 -p 6432 -U <new_role> -d <new_db> -c "SELECT current_database(), current_user;"
# Should connect, show the right db/user, no errors.
```

If this connects, the database is migrated. **You have NOT cut over yet.**
The app still points at Neon — Vercel env update is next.

### 9. Update Vercel env (all three stages — Production, Preview, Development)

> **Critical:** never include a trailing newline in a Vercel env value. The
> dashboard / CLI will store it byte-for-byte and apps then read connection
> strings with a literal `\n` glued on. Use `printf '%s'` (which does NOT
> append a newline) — never `echo`.

```bash
PASS=$(tr -d '\r\n' < "/c/Users/theri/Desktop/<project>-db-password.txt")
URL="postgresql://<new_role>:${PASS}@172.233.154.220:6432/<new_db>?pgbouncer=true&connection_limit=1"
# Vercel CLI may need to be modern (npx @latest) — older versions hit
# "endpoint requires version X.Y.Z or later" on env operations.
npx vercel@latest env rm DATABASE_URL production --yes
printf '%s' "$URL" | npx vercel@latest env add DATABASE_URL production
# Verify byte-perfect:
npx vercel@latest env pull .env.verify --environment=production --yes
grep '^DATABASE_URL=' .env.verify | od -An -c | tail -3
# Last bytes should be: 1   "  \n  (the value's last char "1", then .env-format quote, then file newline)
rm -f .env.verify
```

Repeat for `preview` and `development`. **Caveat for projects with no
GitHub→Vercel git connection** (verified 2026-05-06 sewerreport): the CLI
hangs when adding to `preview` because Preview env vars are normally tied
to a git branch and the CLI's non-interactive flow can't resolve "all
branches" without git. Workaround — use the REST API directly:

```bash
TOKEN=$(grep -oE '"token"\s*:\s*"[^"]+"' /c/Users/theri/AppData/Roaming/com.vercel.cli/Data/auth.json | sed -E 's/.*"token"\s*:\s*"([^"]+)".*/\1/')
PROJECT_ID="<from .vercel/project.json>"
TEAM_ID="<from .vercel/project.json>"
PAYLOAD="{\"key\":\"DATABASE_URL\",\"value\":\"${URL}\",\"type\":\"encrypted\",\"target\":[\"preview\"]}"
curl -s -X POST "https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
# Look for {"created":{...}, "failed":[]} in the response.
```

The token in `auth.json` is what the local `vercel` CLI is already using —
no new credential needed. The file has `// ...` comment lines that break
`jq` parsing, hence the grep+sed extraction.

### 9.5. Delete the Neon-vintage env-var cruft

Neon's "Vercel Postgres" template historically set ~14 env vars per project
(`DATABASE_URL_UNPOOLED`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`,
`POSTGRES_URL_NO_SSL`, `POSTGRES_PRISMA_URL`, `POSTGRES_USER`,
`POSTGRES_HOST`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`, `PGHOST`,
`PGHOST_UNPOOLED`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`). Most apps only
read `DATABASE_URL` via `prisma/schema.prisma`; the rest are dead weight
that still leak the old Neon connection string. Audit code first:

```bash
grep -rE 'process\.env\.(POSTGRES_|PG[A-Z]+|DATABASE_URL_UNPOOLED)' src/ scripts/ prisma/ 2>/dev/null
```

If the grep is empty, all 14 are safe to delete from Vercel. The CLI groups
a single var across environments — deleting "from production" actually
removes from all three at once:

```bash
for var in DATABASE_URL_UNPOOLED PGDATABASE PGHOST PGHOST_UNPOOLED PGPASSWORD PGUSER POSTGRES_DATABASE POSTGRES_HOST POSTGRES_PASSWORD POSTGRES_PRISMA_URL POSTGRES_URL POSTGRES_URL_NON_POOLING POSTGRES_URL_NO_SSL POSTGRES_USER; do
  npx vercel@latest env rm "$var" production --yes 2>&1 | tail -1
done
# Subsequent calls for preview/development will return env_not_found — that's fine.
```

### 10. Update local `.env` (preserve old URL as commented rollback line)

```diff
-DATABASE_URL=postgres://neondb_owner:...@...neon.tech/neondb?sslmode=require
+# Migrated YYYY-MM-DD from Neon to Linode (PG16 behind PgBouncer)
+DATABASE_URL=postgresql://<new_role>:<paste-password>@172.233.154.220:6432/<new_db>?pgbouncer=true&connection_limit=1
+
+# Old Neon URL — kept commented for rollback during the verification window
+# DATABASE_URL=postgres://neondb_owner:...@...neon.tech/neondb?sslmode=require
```

### 11. Pre-deploy schema reconciliation

Before deploying any uncommitted code, diff the local Prisma schema against
production:
```bash
git diff origin/master -- prisma/schema.prisma
```

If your local `schema.prisma` adds tables / columns that aren't on the
migrated DB, you must apply those *to the new Linode DB before the new
deploy goes live*. The OLD deploy keeps using OLD code, so it doesn't
reference the new column — it stays happy on the old DB. The NEW deploy
uses NEW code AND new env (Linode) — the column has to be there.

For trivial nullable column adds, raw DDL is the fastest safe path:
```sql
ALTER TABLE public."<Table>" ADD COLUMN IF NOT EXISTS "<col>" TEXT;
```

For more involved schema changes, use `prisma db push` against the new DB.
PgBouncer transaction-pool mode breaks `prisma db push`, so for that use the
direct `127.0.0.1:5432` connection from inside the Linode (not external).

### 12. Commit, push, deploy

`vercel.json` may auto-deploy on push, OR may not. Check existing deployment
ages with `npx vercel@latest ls` first. If the newest deployment is days+ old
even though commits have been pushed, GitHub→Vercel auto-deploy isn't wired —
trigger explicitly:

```bash
git add <files>
git commit -m "..."
git push origin master
npx vercel@latest --prod --yes
```

> **forsalespokane exception:** that project explicitly forbids `vercel --prod`.
> Check the project's CLAUDE.md / INFRASTRUCTURE.md / PRODUCTION_DEPLOYMENT_CHECKLIST.md
> before running deploy commands. sewerreport's checklist permits `vercel --prod`.

### 12.5. Pitfall: `vercel.json` may delete the lockfile

If `vercel.json` has `"installCommand": "rm -f package-lock.json && npm install ..."`,
Vercel resolves `^X.Y.Z` ranges fresh on every build. That can pull a NEWER
minor of, e.g., the Stripe SDK than what's in your local `node_modules`. If a
package's TypeScript types pin a literal version (Stripe's `LatestApiVersion`
literal bumps with each release), the build will error on whichever side is
older. Fix by casting at the call site:

```typescript
import Stripe from 'stripe';
// ...
const stripe = new Stripe(key, {
  apiVersion: '2025-08-27.basil' as Stripe.LatestApiVersion,
});
```

`as Stripe.LatestApiVersion` defeats the literal-equality check on both sides.

### 13. Watch the deploy

```bash
npx vercel@latest --prod --yes 2>&1 | tee /tmp/deploy.log
# Look for "Compiled successfully" and "Generating static pages (N/N)"
# If it errors with a TypeScript error in a file you didn't touch, that file
# probably has a pre-existing latent error that never built before. Fix it,
# commit separately, redeploy. (sewerreport hit one in scripts/import-wordpress.ts
# and four in src/actions/*Stripe*.ts — pre-existing latent errors.)
```

After "Production: <url> [3m]" with status Ready:
```bash
npx vercel@latest ls | head -3
# Newest line should be your new deploy, ● Ready, Production
```

### 14. Live smoke test (Playwright)

curl can't pass Vercel's bot challenge. Use a real browser. Install on the fly:
```bash
mkdir -p /tmp/sr-playwright && cd /tmp/sr-playwright
npm init -y > /dev/null
npm install --no-save playwright@latest
npx playwright install chromium
```

Run a smoke test that hits a public DB-backed page (any public route that
queries the migrated tables — e.g. a public booking page, listing detail,
public report viewer):

```javascript
// /tmp/sr-playwright/smoke.js  — adapt URL to a real public page on your project
const { chromium } = require('playwright');
const URL = 'https://<your-domain>/<public-db-backed-route>';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36' });
  const page = await ctx.newPage();
  const errors = [], failed = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 500) failed.push(`${r.status()} ${r.url()}`); });
  const resp = await page.goto(URL, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForTimeout(3000);
  const html = (await page.content()).toLowerCase();
  const dbMarkers = ['prismaclient', 'p1001', 'p1017', 'no pg_hba.conf', 'password authentication failed', "can't reach database server"];
  const hits = dbMarkers.filter(m => html.includes(m));
  await page.screenshot({ path: '/tmp/sr-playwright/smoke.png', fullPage: true });
  const ok = resp.status() === 200 && hits.length === 0 && failed.length === 0 && errors.length === 0;
  console.log({ status: resp.status(), title: await page.title(), dbErrorMarkers: hits, failedSubresources: failed, jsErrors: errors, ok });
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
```

### 15. Keep the rollback runway

For 24–48 hours after cutover:
- Don't delete the Neon project.
- Keep the local backup files on Desktop (`<project>-PRE-MIGRATION-*.{dump,sql,rowcounts.csv}`).
- Keep the commented Neon URL in `.env`.
- Keep the `userlist.txt.bak.*` and `pgbouncer.ini.bak.*` on the Linode.

To roll back: revert `DATABASE_URL` in Vercel to the Neon URL, redeploy. The
new Linode DB stays as a no-traffic shadow until you're sure you don't want it.

### 16. Decommission Neon (only after green-light period)

```bash
# Restore-test the backup one final time before deleting Neon (paranoia tax)
# - Use the local PG17 install to spin up a scratch DB and pg_restore the .dump.
# - Compare row counts / structural counts against Neon (which is still live).
# - If clean, delete the Neon branch / project from neon.tech dashboard.
```

## What to also clean up later (separate, non-blocking)

- The Neon-vintage Vercel env vars are still set even though only `DATABASE_URL`
  is read by `prisma/schema.prisma`. Useless cruft; remove when convenient:
  `DATABASE_URL_UNPOOLED`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`,
  `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NO_SSL`, `PGHOST`, `PGHOST_UNPOOLED`,
  `PGUSER`, `PGPASSWORD`, `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`,
  `POSTGRES_DATABASE`.
- Update Preview / Development env to the Linode URL too (or delete them).
- After confirming nothing references it, delete `/root/<project>-migration/` on
  the Linode (it has the dump file with all your prod data — sensitive).

## Pitfalls that bit during sewerreport (so you can skip them)

| Symptom | Root cause | Fix |
|---|---|---|
| `pg_dump: error: aborting because of server version mismatch` | Tried `pg_dump 16` against PG 17 Neon | Use `pg_dump 17` (path A) or install client-17 on Linode (path B) |
| `psql:.../neondb-pg16.sql:13: ERROR: unrecognized configuration parameter "transaction_timeout"` | PG17-only GUC in plain SQL header | Strip in sanitizer |
| `ERROR: role "neondb_owner" does not exist` | Neon's source-side role | Sanitizer rewrites to `<new_role>` |
| `ERROR: role "neon_superuser" does not exist` | Neon-internal default ACL | Sanitizer drops `cloud_admin` / `neon_superuser` lines |
| PgBouncer log: `broken auth file` after appending to `userlist.txt` | Inline shell-escaped quoting mangled the line | Use the heredoc-based script — never inline `psql -c "..."` with embedded SQL quotes |
| Vercel env `DATABASE_URL` ends with `\n` literally | Used `echo` instead of `printf '%s'` | Always `printf '%s'` |
| `git push` doesn't trigger a Vercel deploy | GitHub→Vercel auto-deploy wasn't wired (or disabled) | Explicit `npx vercel@latest --prod --yes` |
| Vercel build errors in files you didn't touch | Latent type errors that no build had ever caught | Fix in a separate commit, redeploy |
| Local `tsc --noEmit` returns 0 but Vercel build catches type errors | tsbuildinfo cache hides errors | `rm -f tsconfig.tsbuildinfo && rm -rf .next/cache` before testing |
| Local Stripe types disagree with Vercel-built Stripe types | `vercel.json` has `rm -f package-lock.json` so Vercel resolves a newer minor | `apiVersion: '...' as Stripe.LatestApiVersion` |
| `curl https://<domain>` returns HTTP 429 with "Vercel Security Checkpoint" | Anti-bot challenge needs JS execution | Use Playwright (real browser) — never use curl for the smoke test |
| `vercel env add NAME preview` hangs / errors on a project without git connection | CLI tries to scope to a git branch that doesn't exist | Use Vercel REST API: `POST /v10/projects/{id}/env` with `target:["preview"]` and the auth token from `~/AppData/Roaming/com.vercel.cli/Data/auth.json` |
| `vercel.json` `"installCommand": "rm -f package-lock.json && ..."` — breaks reproducibility | Forces fresh resolution each build, pulls newer minors than local `node_modules` | Replace with `npm install --legacy-peer-deps --prefer-offline` (or `npm ci` if no preinstall scripts mutate the lockfile) |

## Single-page checklist (printable)

```
[ ] 0  Confirm only plpgsql extension on Neon
[ ] 0  Local PG17 client installed (winget install PostgreSQL.PostgreSQL.17)
[ ] 0  Take pg_dump 17 backup (.dump + .sql) + row-count CSV to Desktop
[ ] 1  ssh root@172.233.154.220 — read-only discovery
[ ] 2  Pick <new_db>, <new_role>, generate password
[ ] 3  scp neon.sql to /root/<project>-migration/
[ ] 3  Run sanitizer; verify 0 forbidden patterns left
[ ] 4  CREATE ROLE / CREATE DATABASE on Linode (sudo -u postgres)
[ ] 5  psql -h 127.0.0.1 -U <new_role> -d <new_db> --single-transaction -f sanitized.sql
[ ] 6  Row-count parity vs Neon snapshot — every count exact
[ ] 6  Structural parity (idx/tab/seq/fk counts)
[ ] 7  Backup pgbouncer.ini + userlist.txt
[ ] 7  sed -i insert <new_db> line in pgbouncer.ini
[ ] 7  heredoc script appends new userlist.txt entry
[ ] 7  systemctl reload pgbouncer; check journalctl for "broken auth file"
[ ] 8  PgBouncer end-to-end test from local machine
[ ] 9  Update Vercel DATABASE_URL (production only, printf '%s', verify with od -c)
[ ] 10 Update local .env, comment old Neon URL
[ ] 11 Diff schema.prisma against production; ALTER TABLE if column-add needed
[ ] 12 git add / commit / push
[ ] 12 npx vercel@latest --prod --yes (unless project forbids it)
[ ] 13 Watch deploy log; iterate on any latent type errors
[ ] 14 Playwright smoke against a public DB-backed route — DB-error markers must be 0
[ ] 15 Keep Neon + backups for 24-48h
[ ] 16 Then decommission Neon
```

## Project-specific `DATABASE_URL` template

```
postgresql://<role>:<password>@172.233.154.220:6432/<db>?pgbouncer=true&connection_limit=1
```

For Prisma migrations (`prisma migrate deploy`) you'll need a `directUrl` that
bypasses PgBouncer. Two options:
- Run migrations from inside the Linode (`127.0.0.1:5432`, no external access needed)
- Add a scoped pg_hba rule: `host <db> <role> 0.0.0.0/0 scram-sha-256`, reload Postgres

Don't add the scoped pg_hba rule unprompted — it weakens the network surface.
The user's stated preference is "PgBouncer only unless we explicitly need direct."

---

*Last validated: 2026-05-06 sewerreport migration. If you hit a new failure
mode, add it to the Pitfalls table.*
