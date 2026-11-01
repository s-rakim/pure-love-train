# How You&I💞 works, and how to fix it

This guide is for keeping the app running on your own: what each part does, where the code lives, how to ship a fix, and what to try when something breaks. You don't need any AI tools for any of it, just a computer with Node, Git and (for the server) Docker.

## The big picture

There are three pieces:

1. **The app** (`src/`). An Expo / React Native app written in TypeScript. Everything is saved on the phone first, so it works offline.
2. **The sync server** (`server/`). A small Node program with a SQLite database that runs in Docker on your always-on machine. The two phones send each other their records through it. It also hands out the daily question and the fortnight's date ideas.
3. **expo.dev**. Builds the APK and sends over-the-air updates. GitHub Actions starts both, so you never build on your own computer.

```
phone A  ⇄  your server (Docker, Tailscale)  ⇄  phone B
                     ↑
            questions.txt, date-ideas.txt
```

## Where things live

| What | File |
| --- | --- |
| Screens (one file per screen) | `src/app/` (tabs are in `src/app/(tabs)/`) |
| Home: streak, checklist, celebrations, restores | `src/app/(tabs)/index.tsx` |
| Daily question card | `src/components/QuestionCard.tsx` |
| Moments and History | `src/app/(tabs)/moments.tsx`, viewer `src/app/moment/[id].tsx`, view once `src/app/once/[id].tsx` |
| Us: days together, milestones, date ideas | `src/app/(tabs)/us.tsx` |
| Settings | `src/app/settings.tsx` |
| Everything saved on the phone (the `State` type) | `src/lib/store.tsx` |
| Streak rules and restores | `src/lib/streak.ts` |
| Celebrations (anniversaries, birthdays, every 100 days) | `src/lib/celebrate.ts` |
| Syncing: what's sent and how it's merged | `src/lib/syncCore.ts` |
| Syncing: talking to the server, photos, videos | `src/lib/sync.ts`, run every 15 seconds by `src/components/SyncAgent.tsx` |
| Notifications | `src/lib/notify.ts`, `src/lib/news.ts`, `src/lib/background.ts`, `src/components/NotifyAgent.tsx` |
| Android widget | `src/widget/` (drawn by `render.tsx`, refreshed by `taskHandler.tsx`) |
| Colours and fonts | `src/theme/index.ts` |
| App name, version, icon, plugins | `app.json` |
| Server code | `server/src/app.ts` (all the routes), `server/src/db.ts` (tables) |
| Daily questions and date ideas | `server/src/content/questions.txt`, `server/src/content/date-ideas.txt` |

## Running it on your computer

```bash
npm install
npx expo start          # press w for a browser preview
npm run typecheck       # catches most mistakes
npm test                # app tests
cd server && npm test   # server tests
```

Always run `npm run typecheck` and both test commands before you ship. If they pass, the change is very likely safe.

## Shipping a change

There are two ways, and picking the right one matters.

**Over the air (most fixes).** If you only changed files in `src/` (screens, text, colours, logic), send it as an update. No reinstall.

1. Push your change to `main`.
2. On GitHub, go to **Actions → Over-the-air update (expo.dev) → Run workflow**, and type a short message like "Fix the question card".
3. On the phones, open **Settings → Check for updates → Restart now**. Phones also pick it up by themselves the next time the app opens.

**A new APK (native changes).** You need a new APK when you add or update a package that has native code (anything starting with `expo-` or `react-native-`), change `app.json` plugins, permissions, the icon or the app name, or upgrade Expo.

1. In `app.json`, raise `version` (like `1.6.1`) and `android.versionCode` (like `161`). The version code must always go up.
2. Push to `main`.
3. Go to **Actions → Android release (expo.dev) → Run workflow** and type the tag, like `v1.6.1`. It takes about 45 minutes, then the APK is on the GitHub release page.
4. Install the APK over the old one. Nothing is lost.

An over-the-air update only reaches phones whose APK has the same native parts. If you send one after a native change, phones simply won't get it until you install the new APK. It doesn't break anything.

Both workflows need the `EXPO_TOKEN` secret in **GitHub → Settings → Secrets → Actions**. If it expires, make a new one on expo.dev under **Account settings → Access tokens**.

## The server

It runs from `docker-compose.yml` on your server machine. After any change in `server/` (including new questions):

```bash
cd pure-love-train
git pull
docker compose up -d --build
```

Useful commands:

```bash
docker compose ps              # is it running?
docker compose logs -f         # what is it saying?
docker compose restart         # turn it off and on
curl http://127.0.0.1:8787/health   # should answer {"ok":true}
```

The data lives in the Docker volume `pure-love-data` (the database plus photos and videos). It survives rebuilds. To back it up:

```bash
docker run --rm -v pure-love-data:/data -v "$PWD":/backup alpine tar czf /backup/pure-love-backup.tgz /data
```

Settings go in a `.env` file next to `docker-compose.yml`: `GOOGLE_CLIENT_ID`, `BIND_ADDRESS`, `MAX_SPACES`, `STORAGE_LIMIT_GB`. The server only listens on the machine itself; `tailscale serve --bg 8787` shares it with your phones over Tailscale.

### Daily questions and date ideas

- `server/src/content/questions.txt` has one question per line (738 of them, just over two years). Day 1 of your space gets line 1, day 2 gets line 2, and so on, so both of you always see the same question and none repeats.
- `server/src/content/date-ideas.txt` gives three new ideas every two weeks. They show under **Us → Date ideas → Fresh this fortnight**.
- Lines starting with `#` are notes and are skipped.
- **Only add new lines at the end.** Inserting or deleting lines in the middle shifts every later day.
- After editing, rebuild the server (above). The server test checks for duplicates: run `cd server && npm test`.
- When the bank runs out it starts again from the top, so add more before your space is about two years old.
- If the server can't be reached, the app falls back to the 40 built-in questions in `src/lib/questions.ts`.

## How syncing works

Every shared thing (a mood, an answer, a note, a moment, a coupon…) is a **record** with a `kind`, an `id` and some `data`. `outgoingRecords()` in `src/lib/syncCore.ts` turns the phone's state into records, and `applyRecords()` turns your partner's records back into state. The server stores them and hands out anything newer than the last one each phone saw.

- **Owned kinds** (only their author can change them): `profile`, `mood`, `answer`, `note`, `moment`, `cycle`, `pick`, `seen`.
- **Shared kinds** (either of you can change them): `dateIdea`, `couple`, `coupon`, `letter`.

To add a new kind you must add it in three places: `OWNED_KINDS` or `SHARED_KINDS` in `server/src/app.ts`, `SHARED` in `src/lib/syncCore.ts` if it's shared, and the two functions above. A server that doesn't know a kind yet answers "Unknown record", and the app keeps retrying until the server is rebuilt.

## How the features work

- **Streak.** A day counts only when both of you answered the question, sent a moment and shared a mood (`activeDays` in `src/lib/streak.ts`). Missing a day resets it to 0. If you missed only yesterday, Home offers **Restore your streak**: two free a month, shared by you both (the `couple` record with id `restores`).
- **View-once moments.** Tick **View once** before sending. Your partner sees a locked tile in History, never on the widget or Home. When they open it, the app marks it opened (a `seen` record), deletes the file from their phone when they close it, and your phone then removes the photo or video from the server. Both of you are left with an "Opened" tile.
- **Celebrations.** Home shows a card on your anniversary (from **Together since**), every 100 days together, and on birthdays (set yours in **Settings**; your partner's comes from their phone).
- **Notifications.** These are local notifications, not cloud push. Every 15 to 30 minutes Android wakes the app in the background (`src/lib/background.ts`), checks your server and posts a notification for each new moment, note or letter. At 8pm you get a nudge if your three aren't done. They can be turned off in **Settings → Notifications**. Instant push would need Firebase, which would mean a Google cloud account.

## When something breaks

| Problem | What to try |
| --- | --- |
| "Can't reach …" in Settings | Is Tailscale on, on both the phone and the server? Does `curl http://127.0.0.1:8787/health` work on the server? Is `tailscale serve status` still showing port 8787? |
| Sync worked, then stopped after an update | Rebuild the server: `git pull && docker compose up -d --build`. A stale server image once showed up as a fake CORS error. |
| The question is the same old one, or Fresh ideas don't show | The server is older than 1.6. Rebuild it. |
| Notifications never come | Android Settings → Apps → You&I💞 → Notifications are allowed, and Battery is set to "Unrestricted". Some phones (Xiaomi, Samsung, Huawei) kill background apps; look up "dontkillmyapp" for your phone. |
| Widget is blank or old | Remove it and add it again. Open the app once so it can draw. |
| "Check for updates" says it couldn't check | The phone needs internet (not just Tailscale). The update comes from expo.dev. |
| An over-the-air update made the app crash on start | Fix the bug and send another update, or go back: on expo.dev → **Updates**, republish the previous update to the `production` channel. As a last resort, reinstall the APK from the GitHub release. |
| The APK build fails on GitHub | Open the failed run and read the red step. The build log itself is on expo.dev under **Builds**. The most common causes are an expired `EXPO_TOKEN` or a tag that already exists. |
| `npm install` errors after changing packages | Use `npx expo install <package>` so the version matches Expo SDK 57, then `npm ci`. |
| Typecheck errors | The message gives the file and line. Usually a typo or a field that was renamed. |
| The server's disk is full | Photos and videos fill up the volume. `STORAGE_LIMIT_GB` caps each space; deleting moments in the app frees space on the server. |

## Upgrading Expo (once a year or so)

Expo releases a new SDK about three times a year. You don't have to keep up, but if you do: `npx expo install expo@latest && npx expo install --fix`, run the checks, raise the version in `app.json`, and build a new APK. Read Expo's changelog for the SDK first.
