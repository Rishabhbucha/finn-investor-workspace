# FINN frontend plan

This is the editable companion to milestone P05 in the original [implementation plan](PLAN.md). Start here when proposing changes to how FINN presents portfolio information.

## Current screens

| Screen | Investor question | Current presentation |
|---|---|---|
| Dashboard | What changed since I last checked? | A 24-hour digest by default, a selectable time window, ranked filings with original links, collapsed routine notices, and end-of-day price or volume alerts. |
| Portfolio | Which companies moved? | Searchable sector heatmap for all 18 stocks, independent of the watchlist. Equal-sized tiles show signed daily and 15-minute moves with an observation timestamp. Selecting a tile opens the observed move, nearby filings and research beneath the map. |
| Research | What evidence explains this company’s performance? | A ticker, question and reporting-period selector lead to cited passages. The Wipro comparison pairs four quarters of earlier guidance with subsequent results. |
| Preferences | What deserves my attention? | Device-local price and volume thresholds, optional foreground refresh, and source health. |

## Visual decisions

- Use emerald (#075844) for workspace structure, midnight ink (#152820) for text, pale mint (#D8EEE4) for company surfaces and periwinkle (#A9A7FF) for transcript markers, citations and guidance ranges. Keep white lilac for reading surfaces, yellow for interaction, and neon green for gains.
- Use the same absolute daily-change bands across sectors: below 1%, 1–<3%, 3–<5%, and 5%+. Tile area is uniform because position weights are unavailable.
- Put all four workspace tabs in the header. Keep Market watch on the right on desktop. On narrow screens it expands below the header.
- Start Market watch with RELIANCE, HDFCBANK, INFY and TCS. Users can select up to eight portfolio stocks and save the selection on their device. Quote requests run every minute while the page is visible. Show the trade time in IST, or a dated closing-price fallback.
- Use green for a gain, red for a loss and an orange tint with “unchanged” for a flat price. Missing changes have a separate text label.
- Keep a filing’s importance separate from its price direction. A threshold alert should identify what crossed the threshold and the period or baseline used.
- Current typography uses Manrope headings and DM Sans body text. Font choice is open.

## Portfolio-analysis ideas to add

Watchlist rows now open the observed move, configured price and volume checks, and “Filings around this move” with original exchange links. The filing window covers the observation date in India and the adjacent calendar days. The selected observation stays fixed while it is reviewed. Each row also shows the last completed 15-minute candle with its opening and closing times. A gain is green, a loss is red, and a flat candle is grey.

Ordinary stock browsing uses green. All four header tabs (including Research), Market signals, filing links, stock-navigation arrows and button feedback use the FINN dot’s yellow (#FFAB00). Impact headings and losses use red. Directional values carry a signed percentage and explicit candle label.

One row per idea. Start with the decision a person needs to make, then describe the smallest visual that would help them make it.

| Investor question or important change | Metric, comparison and period | Where and how to display it | Data needed | Priority |
|---|---|---|---|---|
| Example proposal: Which stock contributed most to today’s portfolio move? | Previous-close portfolio weight × daily stock return, assuming unchanged holdings | A ranked list of contributors with signed percentage-point impact; tap to see the stock and its filing history | Share quantities or prior portfolio weights. The current demo tracks a list of stocks. | To decide |
| Your idea | | | | |

## Acceptance checks for a new view

Someone opening the view on a phone should be able to identify which company changed, by how much, over what period, and why the change appears here. Verify the result with one worked example, one flat value, and one missing observation. Show the source date wherever stale data could change the interpretation.
Dashboard uses Signal Desk in the main column. Threshold alerts lead, followed by filings in priority order. A timeline shows the five most recent qualifying events. Market watch stays on the right.
Market watch indicators: two editable default rules highlight daily or completed 15-minute changes of at least 3% in either direction. Custom thresholds and supported Pine-style formulas can be scoped to all watched stocks or one symbol. Rules persist on this device and evaluate on quote updates.
