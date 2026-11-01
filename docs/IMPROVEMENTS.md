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

## Present in the API but missing from the app (not yet built)

- **Group chats**: sidechat.js has `getGroupChats` / `joinGroupChat`
  (`/v1/chats/explore`, `/v1/chats/groups/join`); the app has no UI for
  them. Upstream PRs #108 and #103 both attempt this and are the starting
  point.
- **Block / hide a user**: `hidePostsFromUser` / `unhidePostsFromAllUsers`
  exist in sidechat.js (since 2.6.2) but are never called by the app.
  Partial answer to #58; true DM delete/block was never reverse
  engineered upstream.
- **Group search**: `searchAvailableGroups` exists; Explore only lists.
- **Poll results viewing**: `viewPollResults` exists; app only votes.
- **DM notifications** (#65): the server pushes only to iOS (APNs). On
  Android the only option is opt-in background polling, with battery
  cost; upstream maintainer declined to build it. Candidate as an
  off-by-default setting.

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

- `npm ci`: OK, 1,334 packages installed clean.
- `npx expo export --platform android`: OK, produced a 5.41 MB Hermes
  bundle - every JS/JSX file in the app compiles with the fixes in.
- ESLint: cannot run - upstream's lint setup is broken independent of
  these changes (ESLint 9 installed against a legacy `.eslintrc.js`, and
  eslint-plugin-react-native then crashes on `context.getScope`).
  Pre-existing; fixing the lint toolchain is a separate chore.
- A full APK build needs the Android SDK / EAS; not run on the audit VM.
