# Pure Love

One cosy app for couples that brings together three things people usually juggle in separate apps:

- **Home** – your shared streak with a little flame that stays lit while you keep showing up, today's checklist, both moods, the latest photo and note from your partner, and a grid of things to do together: send a hug (a one-tap love note), give love coupons your partner can redeem, and a date night spin that picks from your date ideas.
- **Connect** – a daily question whose answers unlock only once you've both replied, love notes that read like a chat (newest at the bottom), and every past answer.
- **Moments** – snap or pick a photo, add a caption and send it to your partner. Their newest photo shows on an Android home screen widget, and yours on theirs. Tap any photo in History to see it full size, swipe through the rest and save it to your phone.
- **Cycle** – log period days, flow, symptoms and mood. The app predicts the next period, fertile window and ovulation from your own history, and you choose whether your partner sees your phase.
- **Us** – the couple dashboard: streak week, days together, countdowns to milestones and anniversaries, pairing and a shared date-idea list.

The look follows the Candle couples app: a dark, near-black interface lit by a bright flame orange, colourful activity cards, rounded DM Sans type and a floating, frosted-glass tab bar. There's also a soft blush-pink light mode. The app follows the phone's light or dark setting, or you can pick one in **Settings → Appearance**. All code, artwork and copy here is original.

| Home | Connect | Moments | Cycle | Us |
| --- | --- | --- | --- | --- |
| ![Home](docs/screenshots/home.png) | ![Connect](docs/screenshots/connect.png) | ![Moments](docs/screenshots/moments.png) | ![Cycle](docs/screenshots/cycle.png) | ![Us](docs/screenshots/us.png) |

## Running it

Built with Expo (SDK 57), Expo Router and TypeScript.

```bash
npm install
npx expo start        # then press i / a / w, or scan the QR code with Expo Go
npm run typecheck
npm test              # cycle, date, streak and sync tests (node:test)
```

## Syncing two phones

Each phone keeps everything locally and syncs through a small server you run yourself (`server/`, Node and SQLite with no other dependencies). It's meant for an always-on computer at home, reached privately over [Tailscale](https://tailscale.com), so nothing goes through a third-party cloud.

**1. Start the server** on the always-on machine (needs Docker and Tailscale):

```bash
git clone https://github.com/s-rakim/pure-love-train && cd pure-love-train
docker compose up -d
curl http://localhost:8787/health   # {"ok":true}
```

Data lives in the `pure-love-data` Docker volume (the database plus photos). Back it up with
`docker run --rm -v pure-love-train_pure-love-data:/data -v "$PWD":/backup alpine tar czf /backup/pure-love-backup.tgz /data`.

**2. Pair the phones.** Both phones need Tailscale on, signed in to the same tailnet.

- On the first phone, open **Settings → Sync**, enter the machine's Tailscale address with the port (for example `http://100.101.102.103:8787` or `http://my-server:8787` with MagicDNS) and tap **Create our space**.
- A six-letter code appears. On the second phone, enter the same address and the code, then tap **Join**.

From then on the app syncs on open, every 15 seconds while it's open, and shortly after each change.

What syncs: names, moods, daily answers, love notes, moment photos, date ideas, love coupons and the anniversary date. For the cycle, only the period dates and predictions are shared, and only while **Share with (partner)** is on in the Cycle tab; logs, symptoms and notes never leave the phone. Each partner can only change their own entries.

The app talks plain HTTP, which is fine inside a tailnet since Tailscale encrypts the traffic. If you'd rather use HTTPS, run `tailscale serve --bg 8787` on the server and use the `https://<machine>.<tailnet>.ts.net` address instead.

To run the server without Docker: `cd server && node src/index.ts` (Node 22.18 or newer; set `PORT` and `DATA_DIR` if you like). Server tests: `cd server && npm test`.

Without a server you can still preview the shared features with **Settings → Preview with a demo partner**.

### The home screen widget (Android)

Long-press the home screen, tap **Widgets** and pick **Pure Love**, or use **Add the widget to your home screen** in the Moments tab. It shows your partner's newest moment. It updates as soon as the app syncs, and every 30 minutes or so it checks the server by itself, so a new photo turns up even if you don't open the app. Tapping it opens Moments.

### Moving to a new phone (Sign in with Google)

Signing in with Google ties your place in the space to your Google account and keeps a private backup on your server of the things that otherwise only live on the phone (names, anniversary, cycle logs and the chosen look). On a new phone, tap **Restore with Google** on the welcome screen and everything comes back, including your moments, notes and answers.

It needs a Google OAuth client, which you set up once:

1. In [Google Cloud Console](https://console.cloud.google.com), create a project and set up the **OAuth consent screen** (External). While it's in testing, add both of your Gmail addresses as test users.
2. Under **Credentials → Create credentials → OAuth client ID**, create a **Web application** client. Copy its client ID.
3. Create a second OAuth client ID of type **Android** with package name `com.purelove.app` and the **SHA-1 fingerprint** of the app's signing key, which is on expo.dev under **Project → Credentials → Android**.
4. On the server machine, put `GOOGLE_CLIENT_ID=<the web client ID>` in a `.env` file next to `docker-compose.yml` and run `docker compose up -d --build`.
5. In the app, open **Settings → Your account → Sign in with Google**.

The app asks the server for the client ID, so nothing needs rebuilding when you set this up.

Next steps:

1. An iOS home screen widget (a WidgetKit extension via a config plugin such as `@bacons/apple-targets`).
2. Push notifications when your partner sends a moment or answers the daily question.

## Project layout

```
src/app/            screens (Expo Router)
  (tabs)/           Home, Connect, Moments, Cycle, Us
  log/[date].tsx    day log modal
  moment/[id].tsx   full-size photo viewer
  onboarding.tsx, settings.tsx, coupons.tsx
src/components/     shared UI, flame, calendar, photo widget, question card, sync, theme
src/lib/            store, cycle maths, dates, questions, photo helpers, sync, Google sign-in
src/theme/          light and dark palettes, fonts, spacing
src/widget/         the Android home screen widget and its background refresh
index.ts            app entry; registers the widget
server/             sync server (Node + SQLite), Dockerfile
docker-compose.yml  runs the server with a persistent volume
```

Cycle predictions are estimates and are not contraception or medical advice.
