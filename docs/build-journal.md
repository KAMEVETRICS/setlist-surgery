# Setlist Surgery build journal

## 2026-10-04 — brief and setup

The user asked to study the DEV Sanity Challenge, then asked for ideas and next steps, then selected the recommended Setlist Surgery concept with “start”. Goal: a Path Two app rescuing a show when a bandmate cancels.

The workspace was empty, with Node 24.19.0 installed. There was no existing Git repository or configured Sanity environment. Sanity Manage opened to a sign-in page. Project selection was requested while independent work continued.

References: Setlist Helper for running-order metadata and total duration; Ableton for related controls in stacked workspaces; bundled Refero craft references for typography, colors, accessibility, and avoiding generic presentation defaults. No live Refero MCP tools were available.

Decision: keep eligibility deterministic and explainable. Runtime AI is optional in this path; the app must not claim generated decisions where it uses rules. Workflow stages are stored as content and are not described as use of the early-access Workflows engine.

Decision: preserve an explicitly labelled local demo until real Sanity access is configured. A remote outage must remain visible and cannot silently change persistence mode.

## Implementation and review

Task 1 complete: domain tests ran red before implementation, then all 12 passed. Task 2 complete for code: five service boundary tests ran red before implementation, then passed. Added reference schemas and an idempotent 25-record seed. Actual Sanity verification awaits account/project access.

Task 3 complete: desktop/mobile show desk, crew and stage-kit controls, explained replacements, repertoire search/add, reorder/remove/reset, rehearsal and approval, history, explicit persistence/errors, dedicated print stylesheet. Browser rescue sequence produced 30:40 and 6/6 playable; saved approval survived reload and became Draft after reorder.

Ruling: use the Sites Vinext starter for owner-private hosted preview and provide standard Next.js scripts as well — both preserve the App Router implementation; a conventional Next.js deployment remains available for challenge eligibility. The two build targets are separately verified.

Ruling: workspace began empty without Git; retain the spec/plan/ledger here and let the Sites source helper create and own repository preparation, commit/push, and packaging. No existing branch or user changes were overwritten.

Windows findings: global npm.cmd resolved its JavaScript entrypoint relative to the checkout, so direct Node invocation and an ignored local launcher were used. The optional Windows Rolldown binary was missing after installation; a package-manager repair added it. Restricted preview Workers runtime failed to start, then launched successfully with approved runtime permissions.

Final review: one fresh read-only reviewer (gpt-6-astra) found three Important issues; no Critical or Minor findings. Invalid display fields/history and the ignored show venue reference each received failing regression tests before correction. The complete suite then passed 20/20. Cross-tab demo overwrite was reproduced in the browser before correction, then the same A/B scenario passed after sessionStorage isolation.

Ruling: isolate local demo state per tab instead of adding shared locking — prevents confirmed changes being overwritten while keeping reload persistence. Cost: closing a demo tab clears its changes. The UI states this behavior; real Sanity sessions use server revisions.

Final review declined live Sanity/account verification and optional App SDK work because no credentials exist. These remain explicitly pending. Browser/design evidence was checked separately in this session. No DEV article was published.

Studio: schema extraction succeeded with a placeholder project ID, and the production Studio build succeeded. The placeholder is for local validation only and is not a claimed Sanity project. The standard Next.js build initially failed on the Cloudflare URI; webpackIgnore leaves that runtime import to the Workers platform and the Node path uses process.env.

## Live Sanity connection

The user configured project `raaqr2vc`, public dataset `setlist_surgery`, and a server token, then said “ready”. Seeded the 25 original catalogue documents with createIfNotExists. The first Node request timed out; a public endpoint check succeeded, and the seed succeeded with Node's ipv4first DNS option. No credentials were printed or committed.

Verified the actual HTTP service against Content Lake: cancellation, three replacements, 30:40 timing, rehearsal, approval, persisted reload, stale revision rejection, and edit invalidation. A separate real content check temporarily incremented the venue changeover, observed updated timing and ineffective approval, then restored the original value with revision guards. Studio schema extraction also passed with the real project metadata.

Configured the hosting environment, marking the API token secret, and redeployed the existing saved version. The native deployment succeeded at environment revision 1. The hosted browser showed Sanity connected and completed the full rescue and approval flow; approval survived reload. Captured the approved 30:40 set in `outputs/sanity-approved.jpg`.

Preserved owner-private hosting. The article now follows the official Path Two template and includes the real project ID/dataset. Judge access, a shareable source link, screenshot upload, and DEV publication remain final submission steps; no article has been sent or published.

Final handoff check found mixed generated route types: the earlier Next.js build had left its validator, while Vinext regenerated the route declaration with different exported names. Next.js typegen restored compatible declarations and the standalone typecheck passed. Its Windows native path check needed the same approved runtime permissions as the build. Added explicit response types to the ignored live verification scripts and documented the regeneration step.

Dataset link check: an anonymous query returned an empty array, while authenticated app queries returned the seeded records. Official Sanity ID/path documentation confirms that IDs containing periods are restricted to authenticated readers. Kept the existing `ss.*` IDs and server repository, removed the misleading public catalogue link, and supplied the real project ID as the challenge allows. No document migration or access expansion was needed.

## GitHub source and Vercel preparation

The user requested a commit to `KAMEVETRICS/setlist-surgery` with unnecessary files omitted, followed by Vercel hosting. Cloned the destination separately; it contained only an MIT license, which was preserved. Copied the app, domain/service code, tests, seed, optional Studio schemas, build evidence, and approved screenshot.

Omitted unused UI components, database/examples, generic public SVGs, generated Studio runtime/schema files, local outputs, credentials, and the Sites/Cloudflare build and connector adapters. Reduced root dependencies to Next.js, React, React DOM, Lucide, Tailwind tooling, TypeScript, and types. The API now reads only Node server environment variables, with the existing service rules unchanged. The root dev/build/start scripts use standard Next.js, and Vercel uses the repository root with Node 24. No Vercel deployment is claimed yet.

The cleaned app passed the 20 domain/service tests, standalone typecheck, and production build. Tested the built Node server against real Sanity: rescue at 30:40, rehearsal, approval after reload, stale write rejection, edit invalidation, and origin protection. A local loopback alias initially triggered Next.js URL normalization; using the documented localhost origin passed. The final cleanup review found two Minor documentation references and no material issues; both references were corrected. The credential/source audit passed. Removed the redundant page wrapper and empty Next.js config as well.

## Public Vercel verification

The user provided `https://setlist-surgery.vercel.app/` after deploying the GitHub app. The public homepage returned 200 and opened in a fresh browser tab without requiring sign-in. The browser displayed Sanity connected, and the production API reported the configured project.

Repeated the live HTTP checks on Vercel: cancellation, three replacements, 30:40 runtime, rehearsal, approval after reload, stale revision rejection, edit invalidation, and origin protection all passed. Independently completed the rescue in the hosted browser, reloaded, and confirmed the saved six-song running order and Approved state. Captured and inspected the actual Vercel screen in `docs/images/sanity-approved.jpg`.

Updated the README, verification record, and DEV draft to use the public Vercel URL. The draft now embeds the GitHub-hosted screenshot and links to the cleaned source repository. No DEV article has been published.
