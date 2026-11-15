# FINN AI chat decision record

Updated 15 November 2026. This is an edited account of the build conversation. The original conversation export or share link is still pending for ENAM submission.

| User direction | Implementation outcome |
| --- | --- |
| Build Option A and choose an AI provider later | FINN handles calculations and evidence retrieval deterministically. An optional server-side gateway can generate cited findings. Without a provider, Research returns source passages. |
| Prioritize portfolio context and original filings | The fixed 18-stock portfolio uses equal-sized sector tiles. A customizable right-hand market watch opens company research around an observed move. Nearby filing timestamps give the investor a lead to investigate. |
| Turn Briefing into a dashboard | Signal Desk brings together a time-windowed filing digest, material announcements, closing price and volume alerts, and links to investigate a company. |
| Make research answers verifiable | Company Desk shows document coverage before a question. Claim citations lead to passages labelled with document title, period and PDF page, with a link to the original filing. |
| Remove Preferences and combine alert controls | Market watch houses the indicator editor, portfolio closing thresholds and refresh control. Data health is on Dashboard. |
| Support multiple conditions and preserve movement colors | Indicators accept up to three levels. The highest cleared level controls yellow tile shading. Watchlist gains use neon green and losses use coral red on deep red. |
| Offer multiple candle intervals | Investors can display 15m, 30m, 1h or 3h completed candles. Each indicator retains its own timeframe. Switching the display avoids marking a longer candle for a shorter rule. |
| Put stocks ahead of configuration | The stock rows appear before Indicators, Candle interval and Customize stocks on desktop and mobile. |
| Review unwanted files before cleaning | The cleanup review distinguishes generated files and superseded previews from source, local data and submission evidence. |

The latest recorded suite passed 32 tests. Browser checks covered interval switching, rule persistence, mobile layout and stock-to-research navigation. The AI citation flow was checked with a sample provider response. Live commercial AI integration, reviewer hosting and the original chat export remain open.

[Milestone and verification log](BUILD_LOG.md) · [Run instructions](README.md)
