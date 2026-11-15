# FINN — investor intelligence prototype

Mobile-first Option A: deterministic source ingestion, calculations and alert rules, with bounded primary-source retrieval and an optional AI gateway.

## Run
Requires Node 22.13+, npm and Python 3.10+ for ingestion.

```sh
npm ci
npm run dev
```

Open the local URL printed by the server. Use the displayed sign-in link if research/refresh asks you to sign in; the starter provides a local-only test identity. The checked-in snapshot is real fetched data, not invented example financials. Data is a dated snapshot, not a live subscription.

```sh
npm test
npx tsc --noEmit
npm run build
```

## Refresh real data
```sh
python -m pip install -r requirements.txt
python scripts/ingest.py --refresh
```
This fetches 18 market histories from Yahoo and the last 30 days of NSE announcements. Failed connectors preserve older values and record failure timestamps. Daily candles before 16:00 IST are excluded for the current day. The baseline uses the previous 20 completed trading observations. Adjusted-price/corporate-action handling remains a limitation. The Refresh data button also fetches and persists data in R2 without a rebuild. Enable the 15-minute refresh under Market watch → Indicators → Portfolio closing indicators. FINN checks while the app is visible. Python refresh updates the deployment seed only; an existing saved R2 snapshot takes precedence.

## Import primary-source PDFs
```sh
python scripts/ingest.py --url HTTPS_PRIMARY_PDF_URL --symbol INFY --period FY27-Q2 --title "Company earnings call" --type transcript
python scripts/ingest.py --url HTTPS_PRIMARY_PDF_URL --symbol INFY --period FY26 --title "Company annual report" --type annual_report
```
Optional `--file PATH` imports a locally downloaded PDF while retaining its original `--url`. Import only company/exchange primary documents. The importer does not independently establish the authenticity of an operator-supplied URL. Scanned PDFs require OCR and currently fail clearly. Source metadata, SHA-derived identity, PDF page numbers and text chunks are retained. Run import commands serially; they update one JSON snapshot.

## Discover a company outside the demo set
```sh
python scripts/discover.py --symbol WIPRO --limit 3
```
Uses the same exchange discovery and PDF import pipeline for arbitrary NSE symbols. Successfully verified with WIPRO outside the 18-stock portfolio. Automatically discovered periods are explicitly unverified until checked against the document. The web research endpoint now discovers up to two recent NSE transcripts from five candidate filings automatically when the symbol has no indexed documents. Downloads are capped at 4 MB and 60 pages; discovered reporting periods remain explicitly unverified. Annual report discovery still requires the manual importer. Python import changes the seed; an existing saved R2 snapshot takes precedence.

## Research and optional AI connection
Without a configured provider, Research returns labelled original-source evidence. It does not claim to produce AI conclusions.

The provider-neutral HTTPS gateway contract is implemented server-side. Configure these runtime values through the hosting environment, never browser code:
- AI_GATEWAY_URL: a trusted HTTPS adapter implementing the contract below.
- AI_GATEWAY_KEY: secret bearer credential.
- AI_MODEL: optional model identifier forwarded to the adapter.

No commercial model adapter has been selected or live-tested. A raw Gemini/Anthropic/OpenAI endpoint is NOT a drop-in replacement for this custom gateway contract. Implement the selected provider adapter after choosing a provider.

Request: `{model, question, symbol, evidence, instructions}`. Evidence includes citation ID, original URL, PDF page, reporting period and passage text. Maximum eight passages, at most three per document, one model request, 25-second timeout, no browser-side key. Response must be JSON:
```json
{"summary":"Short answer", "claims":[{"text":"Evidence-backed finding", "citations":["S1"]}], "limitations":["Missing comparable period"]}
```
A failed or malformed model response falls back to the retrieved passages. Every claim needs an existing evidence ID. The validator checks reference existence and response structure, not semantic entailment or numerical accuracy. Verify source support manually before using AI output. Missing data returns a coverage message. Retrieved documents are explicitly treated as untrusted evidence.

## Files
- `PLAN.md`: milestone scope and acceptance criteria.
- `BUILD_LOG.md`: actual implementation outputs, checks and remaining work.
- `app/page.tsx`, `app/globals.css`: responsive investor workspace.
- `app/api/snapshot/route.ts`: source metadata and market data API.
- `app/api/research/route.ts`: bounded retrieval and optional gateway.
- `lib/engine.mjs`: deterministic calculations, classification, deduplication, retrieval and citation validation.
- `scripts/ingest.py`, `scripts/discover.py`: public-source ingestion.
- `data/snapshot.json`: real fetched snapshot and indexed PDF passages.
- `tests/engine.test.mjs`: meaningful calculation, filtering and evidence tests.

## Try FINN

1. **Dashboard → Signal Desk.** Start with the last 24 hours, or widen the window to 30 days to explore the saved snapshot. Filter exchange filings by category, inspect closing price and volume alerts, or expand Data health for the most recent connector results.
2. **Market watch.** Stocks appear first. Below the list, use **Customize stocks** to choose up to eight portfolio companies and **Candle interval** to select 15m, 30m, 1h or 3h. FINN uses completed candles aligned to the regular NSE session. Partial closing buckets are excluded. On a narrow screen, tap **Open market** for the right-side watchlist and **Back** to return.
3. **Indicators.** Add a percentage rule, enter a supported formula or import a Pine-subset file. A rule can have up to three levels. The strongest matching level sets the tile’s yellow shade. The caption names the rule and its timeframe. Switching the displayed candle keeps the rule on its saved interval. **Portfolio closing indicators** controls portfolio-wide daily price and volume thresholds and optional refresh. Settings are stored on this device.
4. **Research → Company Desk.** Open a stock tile to carry its observation into **Filings around this move**, or go straight to Research to select a company and reporting period. Ask a question and follow a citation from a finding to its supporting passage and original PDF page. Source-only mode displays passages directly. Wipro’s four-quarter review pairs guidance and results with page references.
5. **Portfolio.** Explore the 18-stock sector heatmap, then select a company for research. Equal tile area reflects the absence of position weights. Editing Market watch changes the sidebar selection independently.

Market watch polls while the page is open. Quotes may be delayed. FINN does not deliver background notifications. The web storage layer uses conditional writes with retry so a refresh can run alongside transcript discovery.

## AI build history

[AI chat decision record](AI_CHAT.md) summarizes how the project changed through feedback. The original conversation export or share link is a separate submission item.

## Verification and delivery

Run `npm test`, `npm run lint`, `npx tsc --noEmit` and `npm run build`. The 14 November acceptance review is in CRITIQUE.md. BUILD_LOG.md records milestone outputs. COVERING_NOTE.md is a draft with placeholders for the submission links. The full AI conversation export is a separate submission item.

The optional commercial model is unselected. Citation validation does not establish that a model claim is supported by the cited text. Annual reports need manual import. Automated cross-company guidance extraction, detailed quarterly financial tables, and split-adjusted price alerts remain outside this build. The project has been verified locally. Hosted production access and GitHub delivery are pending.
