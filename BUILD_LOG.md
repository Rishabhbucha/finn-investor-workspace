# FINN build evidence

## P01 — setup
- Created Vinext/React project and private Sites registration.
- Persisted hosting identity in .openai/hosting.json.
- User chose a configurable AI connection; no provider credential supplied.
- Initial installation could not start: npm is absent from the system PATH. Resolving package-manager setup; no successful build claimed.
- Network permission requested for dependency installation and data checks.


## P01 — dependency repair
- npm was absent; downloaded a workspace-local npm runtime.
- Windows parallel directory/cache writes repeatedly failed with EPERM.
- Pre-created dependency/cache directories and reduced installation concurrency; npm completed: changed 893 packages in 2m.
- No system-wide package-manager changes made.

## P02 — real data outputs
- Yahoo: 18/18 price and volume histories fetched successfully.
- NSE: default feed returned zero portfolio matches; explicit 30-day date bounds yielded 270 real portfolio announcements.
- Original annual report and transcripts downloaded/extracted for Infosys, TCS and HCLTech.
- Generic discovery verified with WIPRO, outside the portfolio: one transcript imported.
- Six documents are indexed, including one annual report. Missing data remains explicit.
- Snapshot is build-time data. Hosted scheduling and browser-driven import are unfinished.

## P03 — push workflow
- Prioritised source-linked filing cards, category and date-window filters, collapsed routine filings.
- Price/volume alerts use configurable thresholds and deterministic arithmetic.
- Deduplication uses company plus attachment URL. Filing timestamps are parsed as IST.
- Board-meeting notices are down-ranked; keyword classification still needs broader evaluation.
- EOD importer excludes the unfinished current candle before 16:00 IST.

## P04 — research output
- Primary-source, company-scoped keyword retrieval, eight-passage budget, three passages per document.
- API validates input, supplies page-level source links, returns coverage messages for unavailable evidence.
- Provider-neutral HTTPS gateway seam, secret configuration, one-request budget and 25-second timeout.
- Citation IDs checked before showing generated claims. Semantic support is not automatically proven.
- Provider is deliberately unselected; current usable output is labelled evidence search.
- No automatic four-quarter promises-versus-delivery conclusion is claimed.

## P05 — interface output
- Briefing, Research, Portfolio, Preferences; responsive layouts and bottom navigation for phones.
- Real snapshot timestamps and per-connector data health.
- Source evidence expands into original passages and PDF page links.
- Device-local preferences; no simulated notifications or fake research text.

## P06 — validation so far
- Nine engine tests passed: percentage edge cases, configurable volume rules, digest dedup/time/company filtering, ticker validation, company/source isolation, invalid citation rejection, real source coverage and classification.
- TypeScript initially found request typing issues; fixed with input schema validation and nullable-value handling. TypeScript then passed.
- Build found one Windows-encoded layout file; converted to UTF-8 and restarted build.
- Browser and deployment results will be appended after verification.


## Verified before the usage interruption (9 November)
- Production build passed after encoding repair.
- Home and snapshot HTTP 200; INFY evidence retrieval and UNKNOWN missing-data responses verified.
- Phone viewport 390 x 844 visually checked; bottom navigation and cards fit.
- Saving a 1% price threshold changed the visible market-signal count from 0 to 12.
- Screenshot saved at ../finn-mobile.jpg.
- Browser completion-summary action was rejected because automatic approval review hit the account usage limit. No deployment was completed.

## Continuation — 13 November 2026
### Refresh and persistent storage
- Added lib/market.mjs: completed-session price handling, exchange timestamps, source normalisation, bounded batches and failure preservation.
- Added lib/snapshot.ts and BUCKET R2 binding: saved JSON snapshot survives requests and rebuilds on the same storage binding.
- Added authenticated POST /api/refresh and a Refresh data button.
- Local integration result: refresh HTTP 200 in 5.2 seconds; 18 market histories and 290 retained filings; no connector failures.
- 14 automated tests pass, including 5 new refresh/normalisation tests.
- Anonymous refresh and research calls return HTTP 401 as expected. Local preview requires the starter's local sign-in.

### New-company research
- Added lib/discovery.ts: query NSE for recent transcript filings for any validated symbol, fetch only fixed exchange host URLs, reject redirects, cap downloads at 4 MB and PDFs at 60 pages.
- Extract up to 2 documents per request with unpdf; preserve page evidence, hash identity, original URL and explicitly unverified reporting period.
- Store newly discovered documents; retrying research uses cached documents.
- Local integration result: TECHM (absent from seed) discovered 2 transcripts, returned 6 source passages in 6.4 seconds, and increased persisted document count from 6 to 8.
- Updated checked-in seed through the existing Python importer to 290 filings and 8 documents across 5 companies.
- No live model invocation performed: provider selection remains deferred by user.

### Publication blocker
- Existing Site remains private/owner-only, version 0, with no deployed URL.
- Automatic approval review rejected repository synchronization because sending the code to the external private Sites repository was not explicitly authorized.
- No workaround attempted. Local implementation and checks continued. Final approval must identify the code, source data and private destination before retrying publication.


## Final local verification — 13 November
- 14/14 automated tests passed after final implementation.
- TypeScript completed with no errors.
- Final production build passed all five build stages; routes: /, /api/snapshot, /api/refresh, /api/research.
- Source download redirects are rejected with manual redirect handling, compatible with Workers.
- Re-reading /api/snapshot confirmed persisted updates and imported documents.
- Latest visual browser attempt timed out and reset the browser tool. Fresh refresh/discovery visual QA remains unverified; prior phone-layout QA is not represented as a new test.
- Source package prepared locally, excluding dependencies, credentials, local state and build output.
- AI provider, full guidance-versus-delivery analysis, scheduled refresh, GitHub publication and production verification remain pending.

## 14 November · acceptance review and rebuild

- Wrote ten acceptance checks first. Recorded each before/after finding in CRITIQUE.md.
- Ran the original 14 tests and reproduced five additional failures. Expanded the suite to 22 checks including a competing storage write and model fallback.
- Rebuilt market and filing edge cases, fresh research state, period selection, provider fallback, storage merges and transcript eligibility. Published no external changes.
- Verified Wipro figures in five company earnings-call PDFs and added four manually checked guidance/result pairs to the research screen.
- Reran live discovery for COFORGE and MPHASIS and recorded the separate missing-data outcome for LTIM. Refreshed the downloadable seed to 296 filings. Both the browser refresh and the Python seed refresh succeeded.
- Verified all four tabs on a phone-size Chrome viewport, desktop layout, persisted preferences, period filtering, citations and the optional foreground refresh timer. New screenshot: ../finn-guidance-mobile.png.
- Final checks: 22/22 tests; full lint, types and production build passed. Refreshed source ZIP, setup guide, plan and covering-note draft. Production hosting, GitHub, full AI history and a live model remain open.

## 15 November · dark interface

Applied an orange and near-black theme across all four screens. Briefing and Portfolio now share one signed movement label: blue for unchanged, green for increases and red for decreases. Missing changes use a neutral text label. Verified all four states in both views with browser-only sample data, checked narrow and desktop layouts, and captured the phone portfolio using the real snapshot. All 22 tests and TypeScript checks passed.

## 15 November · top navigation and market watch

- Rebuilt all four screens with the specified four-color palette, blended surfaces and borderless panels. Replaced the vertical and bottom navigation with header tabs.
- Added a right-hand quote panel across the desktop workspace and a compact expandable panel on phones. Choose up to eight of the 18 portfolio companies. Save or cancel edits, with selections stored on this device.
- Added the intraday quotes endpoint with a one-minute per-symbol cache and provider timestamps. A failed request retains the last dated trade or displays a labelled saved close. EOD alerts still use the completed trading-session data.
- Local live-feed check returned timestamped INR quotes for INFY and TCS. Verified desktop placement, all four phone tabs, watchlist persistence, invalid-symbol rejection and a simulated quote outage. The 24 automated tests, TypeScript, changed-file lint and production build passed.

## 15 November · market moves and impact review

- Green identifies stock browsing. Red marks the Market signals shortcut and research/impact controls. Candle badges use green for gain, red for loss and grey for flat.
- Each watchlist row opens a fixed observation in Research with daily and candle changes, configured EOD rule checks, and original filing links within one India calendar day on either side of the observation.
- Quotes now retrieve five days of 15-minute bars. The daily comparison uses the previous daily close. Missing bars are explicitly unavailable. Cached observations carry a timestamp.
- Verified real gain and loss bars, desktop and phone company switching, 28 automated checks, TypeScript, changed-file lint and production build. Captured the updated briefing and company view.
15 November · Applied FINN-dot yellow to all header selections including Research, button feedback, Market signals, filing links and company arrows. Verified neon-green gains, desktop colors and mobile width in Chrome; TypeScript passed.
Portfolio heatmap: 18 equal-sized stocks grouped by sector, four shared intensity bands, independent watchlist, inline research with keyboard focus return. Browser verified 18 completed candles, search, selection and mobile layout; 28 tests passed. Added evidence markers and guidance range bands.
Signal Desk: implemented time and category filters, lead event, research and source links, recent timeline, routine filings and quiet state. Verified desktop watchlist position, mobile layout and research handoff in Chrome. All 28 tests and changed-file lint passed.
Watchlist indicators: implemented threshold builder, Pine-subset formula parser, file import, named per-symbol rules, device persistence, gain/loss/mixed tile highlights and a downloadable example. Verified 31 tests, TypeScript, lint, and browser flows with controlled +3% and -3% observations, import, reload and mobile removal.
Watchlist alert styling: added a full-width triggered banner, directional colors and matching rule details. Verified desktop gain and loss examples and mobile rule removal in Chrome.
Company Desk: added period-specific document coverage, compact question shortcuts, claim-to-passage citations and original PDF page links. Watchlist selections retain triggered rule numbers and observed moves. Checked the browser handoff, citation navigation and mobile width with controlled data. TypeScript and all 31 tests passed.
Moved closing thresholds and refresh settings into Indicators and data health to Dashboard. Added up to three watchlist conditions per indicator with graduated yellow shading and named level captions. Verified all three levels, no match, persistence and mobile controls in Chrome. TypeScript and 31 tests passed.
Added saved 15m, 30m, 1h and 3h watchlist candle selection and independent indicator timeframes. Completed candles align to the regular NSE opening time. Verified interval switching, rule captions, missing data and Research handoff in Chrome. TypeScript and 32 tests passed.
15 November final snapshot refresh: fetched 18 completed closes dated 13 November. Bundled history retains 296 filings; NSE returned zero matching new rows. Local app refresh reported zero failed sources. Regenerated 13 desktop, mobile and detail previews using the current app and retained existing filenames.
Mobile Company Desk: constrained the research grid column to its available width. Verified six real MPHASIS passages and zero horizontal overflow at 320, 375, 390 and 430 px.
