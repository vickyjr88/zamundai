---
name: nse-investment-advisor
description: Personalized NSE Kenya stock recommendations, EOD analysis, insightful metrics, and forward-looking advice using fundamentals + technicals. Tailored to user investment/risk profile. Research any listed company with past/current data for future expectations. Beats top local analysts with data-driven depth.
version: 1.0.0
metadata:
  openclaw:
    emoji: 📈
    requires:
      bins:
        - curl
        - python3
    envVars:
      - name: NSE_REST_API_BASE
        required: false
        description: Base URL for NSE Academy REST API (e.g. http://localhost:8000/api or your VPS endpoint). If not set, fall back to public NSE scraping.
---

# NSE Investment Advisor

## When to use this skill
Use whenever the user asks for:
- Stock recommendations based on their risk/investment profile
- "Which NSE stocks should I buy / avoid?"
- End-of-day market analysis and key metrics
- Deep research on a specific company (e.g. "Analyze Safaricom / KCB / EQTY")
- Future outlook, price targets, or portfolio ideas

Always start by retrieving or recalling the user's investment profile (risk tolerance, time horizon, portfolio size, preferred sectors, liquidity needs). If not in memory, ask once and store it.

## Core Capabilities
- Ingest latest EOD trading data for the entire market or specific tickers
- Calculate and explain insightful metrics (volume turnover, liquidity ratio, volatility, relative strength, sector ranking)
- Combine fundamentals (P/E, EPS growth, dividend yield, ROE, debt/equity, cash flow trends, management commentary) with technicals (moving averages, RSI, MACD, Bollinger Bands, support/resistance, volume patterns)
- Deliver clear recommendations:
  - Strong Buy / Buy / Hold / Sell / Avoid
  - Specific reasons tied to data + user profile
- Provide 3-6 month forward expectations with scenarios (bull/base/bear)
- Beat local analyst depth: quantitative scoring (0-100), peer comparison, macro overlay (interest rates, inflation, FX, politics), and sentiment from recent news/X

Important: Always include the disclaimer: "This is not financial advice. Past performance is not indicative of future results. Do your own research and consult a licensed advisor."

## Step-by-Step Workflow (Follow Exactly)

1. Retrieve User Profile
   Pull from memory or ask: risk level (conservative / balanced / aggressive), goals, current portfolio exposure, liquidity needs.

2. Ingest Market Data (Priority Order)
   - First try your NSE Academy REST API:
     `curl -X GET "$NSE_REST_API_BASE/eod/latest" -H "Authorization: Bearer $NSE_API_KEY"` (or whatever auth your API uses)
     Also fetch fundamentals endpoint if available (`/fundamentals/<ticker>`).
   - Fallback: Use browser tool on https://www.nse.co.ke/ and https://www.nse.co.ke/dataservices/end-of-day-data/ (or public pages).
   - Pull historical daily data (last 30-90 days) for technical calculations.
   - For any specific ticker: fetch full profile + recent announcements.

3. Run Quantitative Analysis
   Use Python (via python3 or code execution tool) to calculate:
   - Technical indicators (SMA20/50/200, RSI14, MACD, Bollinger, ATR)
   - Key metrics: % change, volume vs 30-day avg, turnover (KSh), liquidity ratio
   - Fundamental ratios + growth trends
   - Composite score (weighted: 40% fundamentals, 30% technicals, 20% momentum, 10% macro/sector)

4. Generate Recommendations
   - Portfolio-level: 3-5 stocks to consider + 2-3 to avoid, with allocation suggestions matching risk profile.
   - Company-specific: Detailed report with past performance, current valuation vs peers, catalysts/risks, and probability-weighted future price range.

5. Output Format (Always Use This Structure)

📊 NSE Market Snapshot (EOD [Date])
- Key indices performance
- Top gainers / losers / volume leaders
- Market breadth & sentiment summary

👤 Personalized Recommendations
Stocks to Consider (Buy/Hold)
1. TICKER - [Recommendation]
   - Entry range | Target | Stop-loss
   - Reasons (fundamentals + technicals + fit to your profile)
   - Risk-adjusted expected return

Stocks to Avoid
1. TICKER - [Reason] - [Specific risk for your profile]

Deep Dive: [Requested Ticker]
- Current price & EOD stats (volume, change, turnover)
- Technical analysis (chart patterns + indicators)
- Fundamental health (key ratios + trends)
- Peer comparison table
- Forward outlook (3 scenarios with probabilities)
- Final verdict + confidence level (High/Medium/Low)

Risks & Next Steps
- Key risks
- Suggested monitoring triggers
- When to review again

## Guardrails & Best Practices
- Never promise guaranteed returns.
- Always source data transparently (cite API or page).
- If data is stale or API fails -> clearly state and use latest public info.
- Cross-check with at least two sources (API + official NSE site).
- For aggressive profiles: highlight growth/opportunity. For conservative: emphasize dividends, stability, liquidity.
- Keep language clear, professional, and actionable - no hype.
- If user wants visuals: generate simple ASCII tables or suggest exporting to CSV.

## Example Triggers
- "Give me NSE stock ideas for my balanced profile"
- "What happened in today's trading at NSE?"
- "Full analysis on KCB"
- "Should I buy Safaricom now?"
- "Update my portfolio recommendations"

This skill turns your OpenClaw instance into a true NSE Academy-grade research arm - far deeper than any single analyst on X.

Ready to deploy? Just drop the file and start using it. Want me to also write a companion skill for portfolio tracking or automated EOD briefings? Let me know!
