---
title: "Setlist Surgery: rescuing a gig with structured content"
published: false
tags: devchallenge, sanitychallenge, sanity, ai
---

*This is a submission for the [Sanity Challenge, Path Two: Vibe-Code Something Strange](https://dev.to/challenges/sanity-2026-09-16).*

<!-- This is an unpublished draft. The public demo, source, and screenshot links are ready for a DEV submission. -->

## What I Built

Setlist Surgery is a show desk for a very specific bad evening: the bassist cancels, and the running order no longer works. The app follows references between song arrangements, performers, and instruments to explain which songs are affected. It suggests rehearsed arrangements that fit the remaining crew and the venue's time limit. A person chooses replacements, checks rehearsal readiness, and approves the resulting set.

The demonstration uses one fictional band, The Static Lines, with twelve original song arrangements. There are no licensed recordings or lyrics. Cancelling the bassist blocks three of the six scheduled songs. Replacing them with Slow Motion, No Signal, and Glasshouse produces a 30:40 set, including changeovers, in a 40-minute slot.

## Demo

[Open Setlist Surgery](https://setlist-surgery.vercel.app/).

The public Vercel app is connected to the actual Sanity dataset. No account or sign-in is required to try it.

To try the scenario:

1. Reset the show and choose **Bassist cancelled**. Three songs need attention.
2. Swap Night Drive → Slow Motion, Static Bloom → No Signal, and Neon Weather → Glasshouse.
3. Check the resulting **6/6 playable**, **30:40** running order, with **9:20** remaining.
4. Choose **Check rehearsal**, then **Approve set**. Reload: the approved set is saved in Sanity.
5. Reorder a song: the review returns to Draft. An approved set also exposes a print view.

![The rescued 30:40 set on Vercel, saved in Sanity and approved after reload](https://raw.githubusercontent.com/KAMEVETRICS/setlist-surgery/main/docs/images/sanity-approved.jpg)

## Code

[Source on GitHub](https://github.com/KAMEVETRICS/setlist-surgery).

The app uses React and the Next.js App Router, deployed on Vercel. The original preview used a Sites Vinext build on Cloudflare Workers. This GitHub repository keeps the standalone Next.js app and omits that hosting scaffold. `lib/engine.ts` owns eligibility and review rules; `lib/show-service.ts` restricts session commands; `lib/sanity.server.ts` owns GROQ and revision-guarded mutations. Studio schemas and the original seed script are included.

## My Build Process

I used Codex to turn the challenge into a small app whose behavior depends on structured content. The initial conversation asked it to study the challenge, suggest ideas and next steps, and then start. The chosen concept was rescuing a show after a bandmate cancels. The work was organized into a domain engine, Sanity repository, complete show desk, and verification/submission evidence.

The most useful constraint was making eligibility deterministic and explainable. A song arrangement declares who and what it needs. Missing references, unavailable crew or gear, unrehearsed arrangements, duplicates, and timing violations block readiness. Suggestions exclude songs already scheduled and arrangements that cannot be played. The interface explains a candidate's fit; the person makes the final choice. AI helped build the app, while these visible rules drive its runtime behavior.

I modeled review as data beside the content. Rehearsal and approval attach to a fingerprint of the running order and its material requirements. A later source change can make the saved approval ineffective even if nobody edits the session. This is the app's Draft → Rehearsal → Approved state machine. I did not implement Sanity's Workflows product or App SDK, and do not claim either integration.

The first implementation used shared local storage. A fresh code review identified that two demo tabs could overwrite one another. The behavior was reproduced, then corrected by isolating demo state per tab. The same review caught an ignored venue reference and incomplete validation of remote records. Failing regression checks were added before fixing those issues. The complete domain and HTTP-boundary suite passed 20 tests, with typecheck and production builds also passing.

Some difficulties came from the Windows environment: the global npm launcher resolved its entrypoint relative to the wrong folder, an optional native build package was missing, and the Workers preview needed runtime permissions. Those fixes are recorded in the build journal. The first live seed request also timed out; endpoint checks succeeded and rerunning with IPv4-first DNS ordering completed the seed.

Once the real Sanity project was configured, I verified actual network writes: cancellation, replacements, rehearsal, approval, reload persistence, rejection of an outdated revision, and invalidation after a reorder. A separate check temporarily changed the published venue's changeover from 30 to 31 seconds. The app read the referenced venue, recalculated timing, and invalidated approval. The original value was restored with revision guards. The hosted browser then completed the 30:40 rescue and retained approval after reload.

After deploying the cleaned GitHub repository on Vercel, I repeated the live HTTP checks and the browser rescue without a sign-in prompt. The public deployment saved all three replacements and retained Approved after reload. The screenshot above comes from that Vercel verification.

The interface uses a charcoal show desk, compact musical metadata, a running-order timeline, and a crew panel. Desktop and phone layouts were inspected; mobile control labels and touch targets were corrected during QA. The dedicated print stylesheet is implemented, although a physical print/PDF output has not been captured.

## Sanity Project Details

- **Project ID:** `raaqr2vc`
- **Public dataset:** `setlist_surgery`
- The project ID above supplies the challenge's required project detail for judging.

Song documents reference performers and instruments. A show references songs and its venue. The venue provides duration and changeover constraints. Rescue session documents store a reference-linked running order, availability overrides, review state, and audit history. The seed creates 25 original catalogue documents and preserves existing records when rerun; session documents are created separately during use.

The server reads Content Lake through GROQ, accepts only known session commands, and patches with `ifRevisionID` so a stale write cannot overwrite a confirmed change. The API token remains server-side as a hosting secret. The public dataset contains fictional demonstration content only.

The document IDs use the `ss.*` namespace. Sanity restricts IDs containing periods to authenticated readers, even in a public dataset. This was confirmed when an anonymous query returned no catalogue documents while the authenticated app loaded them successfully. The submission therefore supplies the project ID; it does not present an empty query endpoint as an inspectable public catalogue. See [Sanity's ID and path rules](https://www.sanity.io/docs/content-lake/ids).

## Agent Session

The source includes the build journal and verification record documenting the decisions and fixes. A public agent-session transcript has not been uploaded.
