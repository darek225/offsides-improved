# Offsides (improved fork) - audit and fix log

Upstream: micahlt/offsides v1.0.1 (main @ 504329a), deprecated by its
maintainer. API layer: micahlt/sidechat.js 2.6.6. Audit date: 2026-11-01.

## Fixed in this fork

1. **DMs only send once per thread** (upstream #83, #105, #106)
   Root cause, verified against the live API by upstream PR #107:
   the server dedupes DM sends by `client_id`. ThreadScreen passed
   `sha256(Android ID)` - the same value for every message - so every send
   after the first returned HTTP 200 echoing the first message and created
   nothing. Fix: fresh `client_id` per send (still 64-char sha256 hex).
   Applies to both `sendDM` and `startDM`.

2. **Older DM messages vanish in long threads** (#83)
   ThreadScreen used an inverted FlatList AND a `column-reverse` container
   (double inversion). Fix: sort messages newest-first explicitly, drop
   `column-reverse`. Note: sidechat.js `getDMThread` has no pagination, so
   very long threads are still bounded by what the server returns in one
   call - that limit is server/API-side, not fixed here.

3. **Silent send/post/comment failures** (#91, DM part of #83)
   - DM draft was cleared before the send; a failed send lost the text.
     Now the draft clears only on success and an error line offers retry.
   - Writer treated a missing/error API result as success and navigated
     away. Now it only navigates on a real created post/comment and shows
     the error snackbar otherwise.
   - A rejected feed fetch left `loadingPosts` stuck true, freezing the
     feed until app restart. Both fetch paths now clear it on catch.
   - MessagesScreen fetch failure left the refresh spinner wedged.

4. **Anonymous mode unreliable** (#104, own-post part of PR #100)
   - Writer passed MMKV's `anonMode` straight to the API; it is
     `undefined` until first toggled and sidechat.js maps that to
     anonymous=false. First-time users posted under their username without
     knowing. The fork defaults anonymous ON (YikYak's norm) and always
     passes a real boolean.
   - Post cards rendered `@{identity.name}` whenever the name was not the
     literal string "Anonymous", even when `posted_with_username` was
     false. Now gated on the flag, with an "Anonymous (you)" label on your
     own anonymous posts.
   - Still open: #104 also reports anonymous *comments* showing usernames
     to iOS users. The comment path passes the same flag correctly in
     code; verifying whether the server still honors `using_identity`
     needs a live account test (see below).

5. **Wrong avatars/images in the feed** (#67, #87)
   UserAvatar, AutoImage and AutoVideo wrapped their JSX in
   `useCallback(..., [])`, freezing the first render forever; FlashList
   recycling then showed the previous post's emoji/image. Removed the
   frozen callbacks; aspect-ratio memos now depend on the real dimensions.

6. **Character limit off by one** (#85)
   The real limit is 255, the writer used 256. Fixed the counter, the
   progress bar, and send is disabled over 255.

## Second pass (v1.1.0, this fork)

7. **Post/reply failures are now diagnosable.** Darek (and upstream #91)
   could not post or reply at all: the writer treated the API's error
   response as success and threw the text away. In addition to the
   first-pass fix, sidechat.js is now patched (patch-package, see
   `patches/`) so a rejected post/comment returns the server's response
   body, and the writer shows it verbatim ("Server said: ...") instead
   of a generic error. If an account-side restriction is the cause, the
   app will now say what it is.
8. **Group chats.** Messages screen has DMs / Group chats tabs: joined
   group chats, an explore list, and a join flow (choose a display name
   or join anonymously, reusing your username + icon). Group threads
   show sender names and a group title. This needed a sidechat.js fix
   first: `getGroupChats` built a broken URL (`/v1/chats/explore&...`
   instead of `?...`), so explore could never have worked.
9. **Photos in DMs and group chats.** The send endpoint accepts assets;
   the thread screen now has a photo button (upload + send), and image
   messages render inline.
10. **Hide posts from a user** (block-lite, #58 partial). Overflow menu
    on other people's posts calls `hidePostsFromUser`, which upstream
    never wired up. True DM delete/block was never reverse engineered.
11. **Poll results.** Percentages + bars after voting, and a "View
    results" button that reveals results without voting. Also needed
    the sidechat.js URL fix (`/v1/polls/view_results&...`).
12. **UI pass.** Messages: tabs, named group cards with member counts,
    proper empty states. Explore groups: fixed the member-count sort
    (comparator returned a boolean, so ordering was garbage). Renamed
    the app "Offsides+" with its own package id
    (`com.darekanderson.offsides`) so it installs next to the original
    instead of fighting its signature.

## Still missing / not built

- **Group search**: `searchAvailableGroups` exists in the API; Explore
  still only locally filters the full list (fine at current sizes).
- **DM notifications** (#65): the server pushes only to iOS (APNs). On
  Android the only option is opt-in background polling, with battery
  cost; upstream maintainer declined to build it. Candidate as an
  off-by-default setting.
- **Leave a group chat / delete a DM**: no endpoint has been reverse
  engineered for either.

## Needs a live account / real device to verify

- DM fix end-to-end (send 3+ messages in one thread, reply after reply).
- Anonymous comments as seen from the official iOS app (#104).
- Switching schools (#92) and email verification (#88): both go through
  account-state endpoints that cannot be exercised without a real
  account, and may be server-side.
- Ban-state feedback (#77): looks like a permanent-ban state upstream;
  the app could at least surface the server's error instead of failing
  silently, which the Writer fix now does for posts/comments.

## Build verification (2026-11-01, this fork)

- `npm ci`: OK, 1,334 packages installed clean (patch-package applies the sidechat.js fixes on postinstall).
- `npx expo export --platform android`: OK, produced a 5.41 MB Hermes
  bundle - every JS/JSX file in the app compiles with the fixes in.
- ESLint: cannot run - upstream's lint setup is broken independent of
  these changes (ESLint 9 installed against a legacy `.eslintrc.js`, and
  eslint-plugin-react-native then crashes on `context.getScope`).
  Pre-existing; fixing the lint toolchain is a separate chore.
- Full APK built 2026-11-01 via GitHub Actions on this repo (workflow
  `.github/workflows/build-apk.yml`, run 41293732181). A local VM build
  turned out to be impossible: this sandbox deadlocks the Gradle
  client-daemon handshake on loopback (proven with `gradle help` on an
  empty project), and a VM replacement wiped the apt-installed JDK
  mid-task. Artifact verified after download: package
  com.darekanderson.offsides, versionName 1.1.0 / versionCode 62,
  minSdk 24, targetSdk 36, arm64-v8a only, 48 MB, Hermes bundle present,
  signed with the repo's debug keystore (upstream's release key is not
  available). Two CI fixes were needed along the way: google-services.json
  is gitignored upstream (committed here, retargeted to the new package
  id; Crashlytics still reports to upstream's Firebase project
  offsides-for-android, harmless for a sideloaded build), and the Kotlin
  sources had to move to the new package so generated R/BuildConfig
  resolve.
- Emulator smoke test (`.github/workflows/test-apk.yml`, run 41323805081):
  the shipped arm64 APK installs cleanly ("Success") but cannot start on
  the x86_64 CI emulator (SoLoader cannot find libreactnative.so under
  ARM translation; impossible on a native arm64 phone). A dual-ABI test
  build with identical code installed, launched to the login screen
  ("Welcome to Offsides", phone number + Send code), stayed alive
  (MainActivity RESUMED, process running), and logged zero FATAL
  EXCEPTIONs; JS bundle confirmed running in logcat. The only JS error
  was the benign "No phone number hints available" (emulator has no
  SIM). Everything past the login screen still needs a real account.

## v1.2.0 - YikYak visual redesign (2026-11-01)

Goal (Darek): look as close as possible to the real YikYak app
(current iOS v5.8.15 - dark-only design).

- **Theme (index.js):** dynamic Material You replaced with a fixed dark
  theme - black background (#000000), near-black cards (#1C1C1E),
  white text, gray secondary (#A7A7AD), teal accent (#00DDB4).
  HomeScreen's per-group generated Material You theme is disabled for
  the same reason (it recolored the whole UI per community).
- **Post card:** radius 20; header is now community name + "• time"
  (was time-first), username demoted to a gray second line (anon fix
  from batch 1 unchanged); DM icon is a paper plane; share button
  added; vote cluster matches the reference: rounded-square outline
  buttons, teal outline/arrow/score when upvoted, red when downvoted,
  white/gray otherwise. Comment cards use the same vote colors.
- **Polls:** pill bars; your pick filled blue (#2F80ED, as in the real
  app), others dark gray; vote counts + percentages right-aligned in
  gray; total votes row under revealed results.
- **Chats:** your bubbles are teal with black text, theirs dark gray;
  radius 16.
- **Chrome:** feed app bar sits on black; Post FAB is teal with a
  black label; login pattern dimmed, dark card, "Offsides+" name.
- Behavior unchanged from v1.1.0. A dev-only Preview screen (sample
  posts/poll, no login) renders when built with EXPO_PUBLIC_PREVIEW=1
  so CI can screenshot the design; release builds never route to it.

## Live verification on Darek's account (2026-11-01)

Darek logged in himself on v1.2.0 and tried to comment. The batch-2
error surfacing did its job: **"Server said: This identity is
currently suspended."** So the original "couldn't post or reply" was
not (only) the app swallowing errors - the account's identity is
suspended server-side. No client change can fix that; the open
questions are scope (identity/group-scoped vs account-wide, test by
posting in another group and by sending a DM) and appeal via Sidechat
support. Confirmed working in the same screenshot: draft kept after
the failed send, 255-char counter, v1.2.0 dark composer.

Emulator verification (run 41327596267, dual-ABI preview build): the
Preview screen rendered all sample cards - community + "• time"
header, teal upvote cluster on the upvoted post, gray outline cluster
at 512, poll pill bar with "63 votes · 12%" and "512 votes" total,
own anonymous post with no username. Zero FATAL EXCEPTIONs, process
alive, JS running. Both screenshots carry an Android "Process system
isn't responding" dialog - that is the CI emulator's own system
process under load, not the app (same dialog in the v1.1.0 test run's
environment class); Darek's phone run shows no such issue.

## Batch 3 / v1.3.0 - unwired API features, crediting, public release prep (2026-11-01)

Method: diffed all 42 sidechat.js methods against app call sites.
Never called by upstream: searchAvailableGroups, unhidePostsFromAllUsers,
getAssetLibrary, getCurrentUser, getUserContent (its URL has the same
missing-? bug), plus internals.

- **Server-side group search** (ExploreGroups): was a local filter over
  a small preloaded list; now debounced API.searchAvailableGroups for
  queries >= 2 chars, local list restored when the query clears.
- **Unhide all users** (Settings): API.unhidePostsFromAllUsers behind a
  confirm dialog. Completes batch 2's hide-posts-from-user (was one-way).
- **Your library** (Writer): API.getAssetLibrary picker strip above the
  composer bar - reuse previously uploaded images/memes (the real app's
  Recents row). Response shape is undocumented; items are normalized
  defensively (string or object URLs), failures show an empty state.
- **Update checks repointed**: needsUpdate() read upstream's
  offsides.micahlindley.com/latest.json and Settings linked upstream's
  releases - an "update" would have replaced the fork with the
  unmaintained original. Now reads this repo's GitHub latest release;
  the card links the matching release tag.
- **Crediting**: Settings header names Offsides+ with "Improved fork
  maintained by Darek Anderson"; About & Credits card credits Darek
  (fork) and Micah Lindley (original, with his support link kept);
  Website button became the fork's GitHub; login screen footer carries
  the same credit line; README rewritten for the public repo with a
  credits section. Removed the footer's MIT claim - upstream ships no
  LICENSE file, so the fork does not assert a license it cannot grant;
  the README states the situation plainly instead.
- package.json version was still 1.0.1 (Settings displayed it and the
  update check compared against it): all version fields now 1.3.0/64.
- Skipped on evidence: getCurrentUser (documented fields carry no
  account status, low value), getUserContent (buggy URL, overlaps
  existing profile endpoints), DM notifications (no Android push
  channel exists server-side).

Verification (v1.3.0): expo export compiles; GitHub Actions build run
41361413218 succeeded (APK verified: com.darekanderson.offsides,
versionName 1.3.0, versionCode 64, ~49.9 MB arm64); emulator run
41361418415 succeeded (install Success, MainActivity RESUMED, zero
FATAL EXCEPTIONs, preview renders). GitHub release v1.3.0 created
with the APK attached, so the repointed in-app update check has a
real target. Repo stays private pending Micah's reply to
micahlt/offsides#110 (publication permission request, opened
2026-11-01 at Darek's direction; a watcher hook checks for replies
every 6 hours).
