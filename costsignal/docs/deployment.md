# Deploying homecostdoctor.com

## What this app needs, before anything else

This is a **Node.js server application**, not a set of HTML files.

21 routes are server-rendered on demand and every API route — the calculator,
quote extraction, the share links — runs server-side. There is no export that
turns it into files a PHP host can serve, and adding one would delete the
product: the calculator would stop calculating.

**This will not run on Hostinger shared / Premium / Business web hosting.**
Those are Apache/LiteSpeed + PHP. Uploading this to `public_html` produces a
directory listing or a 500, not a website. That is not a configuration problem
to solve; those plans have no Node runtime.

It runs on any of these:

| Host | Works | Notes |
|---|---|---|
| **Hostinger VPS** | yes | Needs SSH. Node 20+, a process manager, nginx in front. |
| **Vercel** | yes, easiest | Made for Next.js. Connect the repo, set env vars, done. Free tier is enough to start. |
| Railway / Render / Fly.io | yes | Same shape as Vercel. |
| Hostinger shared hosting | **no** | No Node runtime. |

If you are on Hostinger shared hosting, the fastest correct path is: point the
`homecostdoctor.com` DNS at Vercel and deploy from GitHub. You keep the domain
you bought; only the hosting moves.

---

## Option A — Vercel (this is the chosen path)

1. Push this repo to GitHub — already done, branch
   `claude/home-services-pricing-arch-wpjwqg`.
2. vercel.com → **Add New → Project** → import `nileshpatil30/WordPress`.
3. **Set Root Directory to `costsignal`.** This is the one step that is easy to
   miss and it fails confusingly if you skip it: the repository root is not the
   app, so Vercel finds no `package.json` and the build dies immediately.
4. Framework preset should auto-detect as **Next.js**. Leave the build and
   output settings alone — `output: "standalone"` is handled for you.
5. Add the environment variables in the table below. `SITE_URL` is already
   committed in `.env.production`, so the build gets the right domain even if
   you add nothing else.
6. Deploy. You get a `*.vercel.app` URL immediately — check the site works
   there **before** touching DNS.
7. Project → **Settings → Domains** → add `homecostdoctor.com` and
   `www.homecostdoctor.com`. Vercel shows the exact records to create.

### Keeping the domain at Hostinger

You do **not** need to cancel or upgrade the Hostinger plan, and you do not need
to move the domain anywhere. Hostinger keeps doing the one job it can do here —
being your registrar — while Vercel serves the site. Two separate things:

| | Who does it | Cost |
|---|---|---|
| Owning `homecostdoctor.com` | Hostinger (unchanged) | already paid |
| Serving the website | Vercel | free tier |

Premium Web Hosting has no Node runtime, so it cannot run this app. That is a
limit of the plan, not something to work around, and paying more for a VPS to
avoid a free tier that is better suited to Next.js is not worth it.

### DNS at your registrar

Vercel will tell you the current values; at the time of writing they are:

| Type | Name | Value |
|---|---|---|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

Use whatever Vercel's own Domains screen shows over this table — these change.

In Hostinger: **hPanel → Domains → `homecostdoctor.com` → DNS / Nameservers →
DNS Zone Editor**. Edit the existing `A` record for `@` to Vercel's IP (do not
add a second one — two A records for `@` will send visitors to whichever answers
first), and point the `www` CNAME at Vercel.

Leave the `MX` and `TXT` records alone. Those carry email and any domain
verification; changing the `A` record does not affect them, so Hostinger email on
this domain keeps working.

Propagation is usually minutes, occasionally a few hours. HTTPS is issued
automatically once DNS resolves — you do not need to buy or configure a
certificate, and you should not use Hostinger's SSL for this.

### After it is live

Redeploys happen automatically on every push to the branch. To change the
production branch: Settings → Git → Production Branch.

---

## Option B — Hostinger VPS, from the prebuilt bundle

Only needed if you move off Vercel later. Vercel is the chosen path above.

The zip contains a self-contained server. It does **not** need `npm install`.

```bash
# on the VPS
unzip homecostdoctor-deploy.zip -d /var/www
cd /var/www/homecostdoctor

# node 20 or newer
node -v

# run it
PORT=3000 NODE_ENV=production node server.js
```

Then keep it alive and put nginx in front of it:

```bash
npm i -g pm2
pm2 start server.js --name homecostdoctor --env production
pm2 save && pm2 startup
```

nginx server block, proxying 80/443 to the Node process:

```nginx
server {
  server_name homecostdoctor.com www.homecostdoctor.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}
```

Then `certbot --nginx -d homecostdoctor.com -d www.homecostdoctor.com` for TLS.

---

## Environment variables

| Variable | Required | What it does |
|---|---|---|
| `SITE_URL` | **yes** | Public origin. Baked into canonicals, `og:url`, `robots.txt` and the sitemap **at build time** — changing it means rebuilding. Already set to `https://homecostdoctor.com` in `.env.production`. |
| `DATABASE_URL` | strongly recommended | PostgreSQL connection string. Without it the app refuses to start unless you set the override below. |
| `ALLOW_JSON_STORE_IN_PRODUCTION` | only without a database | Set `true` to run on the JSON file store. **Read the warning below.** |
| `ANTHROPIC_API_KEY` | for quote upload | Without it the PDF upload is disabled and users enter quotes by hand. Everything else works. |
| `NEXT_PUBLIC_GA_ID` | no | Overrides the GA4 property. Set to empty to switch analytics off. |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | no | Overrides the Search Console token. |

Put secrets in `.env.local` on the server, or in the host's environment panel.
Never in `.env.production`, which is committed.

### The JSON store warning

Without `DATABASE_URL` the app stores everything in `.data/store.json`. That
means **every estimate, lead, contributed price and admin edit is lost when the
process restarts or redeploys.** It is fine for a first look at the site. It is
not fine the moment a real person submits anything. Get Postgres before you send
traffic — Neon, Supabase and Railway all have free tiers, and `db/schema.sql` is
the schema.

---

## Search Console and Analytics

Both are already in the build.

**Search Console.** The verification tag renders on every page:

```html
<meta name="google-site-verification" content="ShqGBXZUvFnb_gJUrQngUUy_kdMW4jnaawe_hsd-Ym8">
```

In Search Console choose the **URL prefix** property for
`https://homecostdoctor.com` and verify with the **HTML tag** method — it will
find the tag above.

If you picked the **Domain** property instead, that method ignores the tag and
needs a DNS TXT record at your registrar:

```
Type: TXT   Host: @   Value: google-site-verification=ShqGBXZUvFnb_gJUrQngUUy_kdMW4jnaawe_hsd-Ym8
```

After verifying, submit `https://homecostdoctor.com/sitemap.xml`.

**Analytics.** GA4 property `G-HQ5FP57MWE`, loaded `afterInteractive` so it does
not compete with the calculator during hydration. Two settings are deliberate:
`anonymize_ip` truncates the visitor's IP, and `allow_google_signals: false`
turns off cross-device and advertising personalisation. Both are stated on
`/privacy`. **If you turn either off, `/privacy` has to change in the same
commit** — it currently tells visitors those protections are in place.

Analytics only loads when `NODE_ENV=production`, so local development does not
pollute the property.

---

## Two Vercel limits to know about

**Function timeout.** Quote extraction sets `maxDuration = 60` because reading a
multi-page PDF with a vision model takes 20-60 seconds, well past the ~10 second
serverless default. Plans cap this, and a plan below the cap clamps silently
rather than erroring — so if uploads still time out, the plan's ceiling is the
binding limit, not the code. Everything else on the site responds in
milliseconds and is unaffected.

**Commercial use.** Vercel's free Hobby tier is for non-commercial projects. The
moment this site earns money — a paid report, a lead sold to a contractor — it
needs a paid plan. Budget for that alongside the database rather than being
surprised by it, and note that the paid plan is also what lifts the timeout
above.

---

## Before you point traffic at it

- [ ] `DATABASE_URL` set, or accept that all submissions are lost on restart
- [ ] `npm run admin:create` run, so `/admin` is reachable
- [ ] HTTPS working, HTTP redirecting to it
- [ ] `www` and apex resolving to the same place, one redirecting to the other
- [ ] Search Console verified and the sitemap submitted
- [ ] A real quote PDF run through `npm run test:extract`

## Rebuilding after a change

```bash
cd costsignal
npm ci
npm run build          # reads .env.production, bakes in SITE_URL
```

Then copy `.next/standalone/`, `.next/static/` into place. `npm run build`
**fails** if `SITE_URL` is unset — deliberately, because the previous behaviour
was to silently fall back to `localhost:3000` and publish a sitemap Google would
ignore.
