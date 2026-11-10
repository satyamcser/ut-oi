# Út ơi! ✦ A Tiny Hanoi Adventure

*Dành riêng cho Út ✨ — a little Hanoi universe, built for two very unserious people.*

A small, private, two-player 2D game: walk a pixel-art Hanoi street, visit five places,
play four mini-games, leave each other postcards and questions, and discover a dozen
tiny secrets. Built with **React + TypeScript + Vite + Phaser 3**, hosted on **GitHub
Pages**, with a private **Firebase** (Auth + Firestore) world that only your two
accounts can read.

---

## What’s inside

| Place | What you can do |
| --- | --- |
| ☕ **Cà Phê Cóc & The Outstanding Coffee Debt** | **Matcha Mission** — catch falling ingredients in recipe order (matcha latte, cà phê sữa đá, warm tea; oat-milk option). Coffee Debt Ledger, voucher. |
| 📚 **The Very Unofficial Language Academy** | **Language Exchange Duel** (Vietnamese → English or English → Vietnamese), custom questions for each other (answer or skip), “Teach me one thing”. |
| 🐾 **Simba & the Sleepy Cat Investigation Bureau** | **Find the Missing Pawprints** — a walkable maze; search leaf piles; each player also finds a special object → a shared pet portrait. |
| 🎤 **Professor Út’s Confidence Test** | **Presentation Rescue** — match icons to slides, clear distractions, wave back at the audience. Unofficial Review Certificate. |
| 🌙 **The Moonlit Postcard Studio** | 8 illustrated backgrounds, stickers, “Just for me” or “Share with our little universe”, shared album with reactions, a little “ơi” paper airplane, a poem. |

Also: customisable pixel avatars (hair, skin tone, áo dài unlock, nón lá…), a Passport
& Scorebook (best scores, coffee points, badges, discoveries, friendly “beat my score”
challenges), five hidden postcard pieces with a small ending, a folded letter after
exploring every place, sound off by default (with captions), reduced-motion support,
keyboard + touch controls.

Things that are deliberately **not** here: love scores, streaks, “you missed a day”,
online/last-seen tracking, read receipts, photo uploads, face/camera/location access,
analytics, or anything you must answer.

---

## Step 1 — Run it on your computer

Install **Node.js 20.19+** (LTS), then in this folder:

```bash
npm install
```

```bash
npm run dev
```

Open <http://localhost:5173/ut-oi/>. Without Firebase settings, only **Try demo** is
available: a full local copy of the world that saves nothing and shares nothing.

Tests:

```bash
npm test
```

```bash
npm run test:rules
```

(`test:rules` starts the Firestore emulator and needs **Java 11+**.)

---

## Step 2 — Put it on GitHub

1. Create a new **public** GitHub repository named **`ut-oi`** (free GitHub Pages needs a
   public repo; your data stays private in Firebase either way). Don’t add a README.
2. In this folder:

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "Út ơi! first release"
```

```bash
git branch -M main
```

```bash
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/ut-oi.git
```

```bash
git push -u origin main
```

3. **Settings → Pages → Build and deployment → Source: GitHub Actions.**

The first run will deploy a demo-only site until Firebase is connected (Step 4).

---

## Step 3 — Create the private Firebase world

1. <https://console.firebase.google.com> → **Add project** (Google Analytics: **off** — not needed).
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**
   (leave “Email link” off).
3. **Authentication → Users → Add user** — create exactly two accounts:
   - your email + a password;
   - Út’s login + a temporary password. It can be a playful address you control
     (e.g. a Gmail alias like `yourname+ut@gmail.com`); just note that
     “Forgot password?” only works for real inboxes.
4. Copy each account’s **User UID** from that list.
5. **Build → Firestore Database → Create database** → *production mode* → region
   **asia-southeast1 (Singapore)** (closest to Vietnam).
6. Open **`firestore.rules`** in this project and replace the two placeholders:

   ```
   function satyamUid() { return 'SATYAM_UID_GOES_HERE'; }
   function utUid() { return 'UT_UID_GOES_HERE'; }
   ```

   Then **Firestore → Rules** → paste the whole file → **Publish**.
   (Or with the CLI: `npx firebase-tools deploy --only firestore:rules --project YOUR_PROJECT_ID`.)
7. **Authentication → Settings → Authorized domains → Add domain:**
   `YOUR_GITHUB_USERNAME.github.io`
8. (Recommended) If your console shows **Authentication → Settings → User actions →
   Enable create (sign-up)**, turn it off. Even if someone created another account,
   the rules give it nothing.
9. **Project settings (⚙) → General → Your apps → Add app → Web (</>)** → register
   (no hosting) → copy the `firebaseConfig` values.

---

## Step 4 — Tell GitHub about Firebase

Repo → **Settings → Secrets and variables → Actions → Variables → New repository variable**:

| Name | Value |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |
| `VITE_SATYAM_UID` | your UID |
| `VITE_UT_UID` | Út’s UID |

These are public client values (they end up in the website’s JavaScript anyway).
Security comes from Firebase Auth + `firestore.rules`. **Never** add a service-account /
Admin SDK key anywhere in this project.

Then **Actions → Deploy to GitHub Pages → Run workflow**. When it’s green, the site is at:

**`https://YOUR_GITHUB_USERNAME.github.io/ut-oi/`**

For local development with the real database, copy `.env.example` to `.env.local` and
fill in the same values (`.env.local` is git-ignored).

---

## Step 5 — Before you send the link

- [ ] Rewrite the folded letter in **`src/content/letter.ts`** in your own words, push.
- [ ] Sign in yourself on the live site, choose your look, play one game.
- [ ] Check **Passport** shows your score; open the album and post one postcard.
- [ ] Send Út the link, her login email and temporary password.

---

## Private vs. public — what to know

- **Public:** the website code on GitHub Pages (HTML/JS/CSS), including all in-game
  dialogue, the phrase bank, and the letter in `src/content/letter.ts`. Anyone with
  the URL can load the page and read its source. `noindex` keeps it out of search
  engines but is **not** a privacy control.
- **Private (only your two accounts):** everything in Firestore — profiles, scores,
  shared postcards, reactions, questions and challenges.
- **On one device only:** sound/motion settings and “Just for me” postcards.
- Keep private letters, family matters and photos **out of the code**.

## Editing things

| What | Where |
| --- | --- |
| The folded letter | `src/content/letter.ts` |
| Dialogue, tips, poem, jokes | `src/content/dialogue.ts` |
| Vietnamese / English phrases | `src/content/phrases.ts` |
| Scores, recipes, slides | `src/utils/games.ts` (keep `MAX_SCORE` in `src/content/ids.ts` and `firestore.rules` in sync — a test checks) |
| New badges / stickers / backgrounds | `src/content/ids.ts` **and** the matching list in `firestore.rules` |
| Pixel art | `src/game/art/pixels.ts` (all sprites are drawn in code) |
| The street layout | `src/game/map/hanoiMap.ts` |

## How the security works

- Every Firestore read/write requires a signed-in user whose UID is one of the two in
  `firestore.rules`. Signed-out visitors and any other account get nothing.
- Each player can write only their own profile, scores, postcards and reactions. The
  receiver of a question can only answer/skip it; the author can only edit it while
  open. A “beat my score” challenge can only be marked complete if the database shows
  a real best score that beats it.
- Fields are validated in the rules (allowed keys, lengths ≤ 300/140, ID allowlists,
  emoji allowlist, score ranges, timestamps from the server).
- **Honest limit:** scores are reported by the browser. The rules bound them (range,
  exactly +1 play per save, best = max, max one save per 3 s) but can’t prove a game was
  really played. That’s fine for a friendly two-person game.
- `npm run test:rules` runs 13 emulator tests as a stranger, a signed-out visitor, and
  each player trying to impersonate the other.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Blank page / 404 on GitHub Pages | Pages source must be **GitHub Actions**; repo name must match the URL (`/ut-oi/`). |
| Only “Try demo” shows on the live site | Firebase variables missing → Step 4, then re-run the workflow. |
| “This little world is only for two people” | That account’s UID isn’t in `firestore.rules` **and** `VITE_SATYAM_UID`/`VITE_UT_UID`. Update both, publish rules, re-run the workflow. |
| “The little world said no…” | Rules not published, or a UID typo. Re-publish `firestore.rules`. |
| `auth/unauthorized-domain` | Add `YOUR_GITHUB_USERNAME.github.io` to **Authorized domains**. |
| Sign-in fails | Check the email/password in **Authentication → Users**; reset the password there if needed. |
| Offline | The game still works; changes show “sending…” and sync when you’re back. Scores need a connection. |

## Removing access or data

- **Remove access:** delete the user in **Authentication → Users**, and remove their UID
  from `firestore.rules` (publish).
- **Delete your own postcards:** in the game, **Settings → Delete all my postcards**.
- **Wipe everything:** in **Firestore → Data**, delete the collections (`players`,
  `scores`, `postcards`, `languageChallenges`, `friendlyChallenges`, `sharedWorld`).

---

*Made with a little code, a little poetry, and a suspicious amount of coffee. — Satyam*
