# Verification record — 2026-10-04

## Confirmed

- Node 24.19.0, React 19.2.6, Next.js 16.3.4; Studio Sanity 6.17.0 (official npm package version checked).
- `node --test tests/*.test.ts`: 20 passed, 0 failed. Includes missing references, unavailable crew/gear, duplicate/empty sets, timing/changeovers, stale review, command restriction, origin restriction, revision conflicts, remote failure, invalid display fields and corrupt history.
- The final review's three automated regressions failed before the fixes (two returned 200 instead of 503; the venue query ignored the reference), then passed.
- `node node_modules/typescript/bin/tsc --noEmit`: passed after final review fixes in the source packaging workflow.
- Sites build helper: production build passed. Rebuilt after domain/server and UI review fixes.
- Browser: initial six songs 31:20; bassist cancellation blocks exactly three songs; three replacements restore 6/6 playability at 30:40; rehearsal then approval; reload preserves review; a reorder invalidates approval; reset restores the six-song baseline.
- Browser: Repertoire search for Soft Landing returns its actual record. Mobile navigation keeps accessible names; mobile controls were enlarged. At 390px, document scroll width stays within the viewport.
- Two-tab manual regression: before the fix, cancellation in A was lost after a removal in B and reload of A. After isolation, A retained Leo unavailable and Paper Satellites present while B removed that song. Demo sessions now use sessionStorage.
- Actual Sanity project `raaqr2vc`, dataset `setlist_surgery`: idempotent seed completed for 25 original catalogue records. The public dataset endpoint accepts anonymous queries, but they return no `ss.*` documents because Sanity restricts IDs containing periods to authenticated readers. Authenticated reads and writes succeeded. The submission supplies the real project ID; no empty public catalogue URL is claimed. The token is configured locally in ignored files and in Sites as a secret.
- Live HTTP service checks using actual Sanity: 12 songs; bassist cancellation blocks three; three replacements yield 30:40; rehearsal and approval succeed; reload preserves approval; a stale revision returns 409; a reorder invalidates approval and persists Draft. These are real network requests, not injected transport fixtures.
- Live content check: changed the published venue's changeover from 30 to 31 seconds using a revision precondition. The service dereferenced the changed venue, recalculated the six-song baseline from 31:20 to 31:25, and made the previous approval ineffective. Restored 30 seconds with a revision precondition in a finally block; restoration succeeded.
- Hosted browser on `https://setlist-surgery.gabrieltopeawe.chatgpt.site`: badge says Sanity connected; saved the cancellation and all three replacements; 6/6 playable at 30:40; rehearsal then approval; reload retained Approved and the saved running order. Screenshot: `outputs/sanity-approved.jpg`.
- Studio schema extraction passed using the real project/dataset environment. This is structural verification; it does not claim a hosted Studio or remote schema deployment.
- Native Sites deployment succeeded with runtime environment revision 1 and the existing owner-private audience.
- Final standalone typecheck passed after regenerating Next.js route types. The earlier attempt found a Next.js validator importing names from a Vinext-generated route declaration; `next typegen --webpack` resolved the stale generated-file mismatch. Temporary live verification scripts were given explicit HTTP response types. Neither correction changed application behavior.

## Pending / limits

- Actual print dialog/output has not yet been captured. The app provides an approval-only print button and a dedicated print stylesheet.
- Optional App SDK editor and Sanity Workflows product integration are absent; the app does not claim them.
- DEV submission is a draft and has not been published.
- The original source is synchronized to the managed Sites repository. This cleaned checkout is published at `KAMEVETRICS/setlist-surgery` on GitHub. The DEV draft includes the public Vercel demo and GitHub-hosted screenshot; DEV publication remains pending.

## Design QA

Source truth: the design spec's Setlist Helper/Ableton reference lock, dark neutral canvas, amber rescue/primary actions, row-based running order and stacked related crew controls. Desktop screenshot and phone state inspected in the in-app browser. No content overlap or horizontal overflow observed. Mobile names and target sizes corrected during QA.

Earlier local schema checks: Sanity 6.17.0 schema extraction and Studio production build passed using placeholder project metadata. Subsequent schema extraction used the real project configuration; live content and session verification are recorded above.

Earlier dual-target Next.js 16.3.4 production build: passed with routes / and /api/show. Next.js TypeScript check passed as part of that build. The original preview excluded its Workers import from webpack and fell back to process.env on Node. This cleaned GitHub checkout removes the Workers import entirely and uses the Node runtime directly.

## Clean GitHub checkout

- Copied only the app, its five UI components, five domain/service modules, tests, seed, optional Studio source/lockfile, license, and submission evidence. Local credentials, generated files, unused starter UI/database/examples, and Sites/Cloudflare adapters are omitted. Removed the redundant page wrapper and empty framework config.
- Root dependencies installed from the reduced package manifest; root and Studio lockfiles match their dependency declarations.
- Fresh domain/service run: 20 tests passed, 0 failed.
- `npm run typecheck`: passed; generates Next.js types before standalone TypeScript checking.
- `npm run build`: standard Next.js 16.3.4 webpack production build passed, including its TypeScript check. Routes: static `/`, dynamic `/api/show`.
- Built Next.js server with the real server environment: homepage returned 200; live API performed the bassist cancellation and three replacements; calculated 30:40; rehearsal/approval/reload succeeded; stale revision returned 409; reorder invalidated review; foreign-origin writes returned 403.
- The first local HTTP check used a numeric loopback host; NextRequest normalizes that host to localhost. Rerunning against the documented localhost URL passed without weakening origin protection.
- Bounded final cleanup review found no Critical/Important issues. Corrected the two Minor setup references it found.
- Source audit checked the complete file selection for local credential filenames and the configured token. Neither was included.

## Public Vercel deployment

- URL: [setlist-surgery.vercel.app](https://setlist-surgery.vercel.app/). The homepage returned 200 and opened in a fresh browser tab without a sign-in prompt.
- The live API reported Sanity mode and project `raaqr2vc`. Production HTTP checks passed against the real dataset: cancellation blocked three songs; replacements produced 30:40; rehearsal and approval succeeded; reload retained approval; a stale revision returned 409; editing invalidated review; foreign-origin writes returned 403.
- Browser verification independently completed the rescue: Slow Motion, No Signal, and Glasshouse replaced the three blocked songs; 6/6 playable at 30:40, with 9:20 remaining; Leo stayed unavailable. Rehearsal then approval succeeded, and reload retained the saved running order and Approved state.
- Captured and inspected the approved Vercel screen at `docs/images/sanity-approved.jpg`. The README and DEV draft now link to the public deployment, and the draft uses the public GitHub screenshot URL.
