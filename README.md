# BARINV — Smart Bar Inventory PWA

Single-file Progressive Web App. Supabase backend. Deploys to GitHub Pages in minutes.

## What's different from v1

| Old | New |
|-----|-----|
| Two separate apps | One PWA — same URL for everyone |
| LocalStorage (device only) | Supabase Postgres (shared across all devices) |
| Manual refresh to see updates | **Real-time** — events appear instantly via WebSocket |
| Username + PIN for barbacks | **6-digit night room code** — no account needed |
| Type SKU manually | **Camera barcode scanner** (Chrome on Android/iOS) |
| No offline support | **Offline queue** — actions sync when back online |
| Railway server to maintain | **Zero server** — static files + Supabase |

---

## Files

```
barinv-pwa/
├── index.html     ← Entire app (SPA)
├── sw.js          ← Service worker (offline + PWA install)
├── manifest.json  ← PWA manifest (install to homescreen)
├── schema.sql     ← Supabase database schema + RLS policies
└── README.md
```

---

## Setup (15 minutes)

### Step 1 — Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Pick a name and strong database password
3. Wait ~2 minutes for it to provision

### Step 2 — Run the Schema

1. In Supabase: **SQL Editor → New Query**
2. Paste the full contents of `schema.sql`
3. Click **Run**

### Step 3 — Enable Realtime

1. Supabase → **Database → Replication**
2. Click **0 tables** under Source
3. Toggle **events** table ON

### Step 4 — Create Admin Account

1. Supabase → **Authentication → Users → Invite user** (or use "Create new user")
2. Enter your admin email and password
3. **Important:** Go to Authentication → Settings → disable "Enable email confirmations" for internal/private use, OR confirm via email link

### Step 5 — Get Your API Keys

1. Supabase → **Settings → API**
2. Copy:
   - **Project URL** (e.g. `https://abcxyz.supabase.co`)
   - **anon/public key** (long JWT string)

### Step 6 — Deploy to GitHub Pages

```bash
cd barinv-pwa
git init
git add .
git commit -m "init: barinv pwa"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/barinv-pwa.git
git push -u origin main
```

Then in GitHub: **Settings → Pages → Source → main branch → Save**

Your app is live at: `https://YOUR_USERNAME.github.io/barinv-pwa/`

### Step 7 — First-Run Config

1. Open your GitHub Pages URL
2. The setup wizard appears automatically
3. Paste your Supabase Project URL and anon key
4. Click **Test & Save**

---

## Nightly Workflow

### Admin

1. **Nights → + New Night** → name it, pick date → a 6-digit room code is auto-generated
2. Share the room code with barback staff (SMS, Slack, etc.)
3. **Clicker** page → select tonight → track taken/returned per station
4. **Events** page → approve or reject barback submissions
5. **Dashboard** → watch live as events come in

### Barback Staff

1. Open the app URL on their phone
2. Tap **Night Code** tab
3. Enter their name and the 6-digit code
4. Submit events: tap **Scan Barcode** or search for item → pick action → Submit

---

## Install on Phone (PWA)

**Android (Chrome):** Tap the "Add to Home Screen" prompt, or menu → "Install app"

**iPhone (Safari):** Share button → "Add to Home Screen"

Once installed, the app works offline and launches like a native app.

---

## Offline Behavior

- If the device loses connection, a banner appears at the top
- Events submitted while offline go into a local queue (IndexedDB)
- When back online, the queue syncs automatically
- The queue count shows in the top bar

---

## Barcode Scanning

Uses the native `BarcodeDetector` API (Chrome 83+, Edge 83+, Chrome for Android).

Supported formats: EAN-13, EAN-8, Code 128, Code 39, UPC-A, UPC-E, QR codes.

**Safari (iOS):** BarcodeDetector is not supported. Barbacks can still type/search the SKU or item name.

To add barcodes to items: **Setup → Items → Edit** → enter the barcode number in the SKU field.

---

## Supabase Free Tier Limits

| Resource | Free Limit |
|----------|-----------|
| Database | 500 MB |
| Bandwidth | 5 GB/month |
| Auth users | 50,000/month |
| Realtime connections | 200 concurrent |

More than enough for bar operations.

---

## Troubleshooting

### "Connection failed" in setup wizard
- Check URL format: must be `https://xxx.supabase.co` (no trailing slash)
- Check you ran `schema.sql` completely
- Check anon key is the "anon/public" key, not the "service_role" key

### Admin can't log in
- Make sure you created the user via Supabase Auth (Dashboard → Auth → Users)
- Disable email confirmation for private use (Auth → Settings)
- Password must be 6+ characters

### Night code not working
- Night must be set to Active (green badge in Nights page)
- Code is case-sensitive but is always digits only
- If night was closed by admin, code won't work

### Real-time not working
- Make sure `events` table is enabled in Supabase → Database → Replication
- Realtime requires a live internet connection

### Barcode scanner not appearing
- Only works in Chrome and Chrome-based browsers
- Must serve over HTTPS (GitHub Pages does this automatically)
- User must grant camera permission

### Events submitted but not appearing
- Check Events page filter — may be filtered by night/status
- Check Supabase → Table Editor → events to confirm the row exists

---

## Customization

All config is in `index.html`. Key things to change:

- **App name**: Search for `BARINV` in index.html
- **Colors**: CSS variables at the top (`:root { --a: #ff8c00; ... }`)
- **Actions**: The `CHECK` action options in the submit form
