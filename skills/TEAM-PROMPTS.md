# Team Prompt Patterns for Tender Skills

Use these prompt patterns in OpenClaw for consistent outputs.

## 1) Tender summary prompt

```text
Use the tender-document-summary skill.
Summarize the tender package below and return one final answer using the template sections:
- Executive summary
- Key facts
- Scope of work
- Eligibility and mandatory requirements
- Evaluation criteria
- Submission requirements
- Risks and red flags
- Clarification questions
- Recommended next actions
- Recommendation (Bid | Bid with caution | Needs clarification | No bid)

Tender package:
<paste document text or extracted sections>
```

## 2) Bid checklist prompt

```text
Use the tender-bid-response-checklist skill.
Turn this tender summary into an actionable bid workplan with owners, dependencies, due dates, compliance gates, and a readiness status.

Team roles available: Bid Manager, Technical Lead, Legal, Finance, Delivery Lead, Bid Coordinator.
Submission deadline: <date/time>

Tender summary:
<paste summary>
```

## 3) Combined workflow prompt

```text
Step 1: Use tender-document-summary to summarize the tender package.
Step 2: Use tender-bid-response-checklist to convert the summary into a bid execution plan.
Return both outputs in order, with no duplicate sections.

Tender package:
<paste document text or sections>
```

## Slash command style patterns

If your OpenClaw UI exposes skill slash commands, use:

```text
/tender-document-summary summarize this tender and give a bid/no-bid recommendation with risks and clarifications
```

```text
/tender-bid-response-checklist create a bid workplan with owners, due dates, dependencies, and readiness status
```

## 4) NSE investment advisor prompt

```text
Use the nse-investment-advisor skill.
My profile: balanced risk, 12-month horizon, medium liquidity needs, KES 500,000 portfolio, sectors preferred: banking and telecom.
Give me today's NSE market snapshot, 3 stocks to consider, 2 to avoid, and a deep dive on Safaricom with entry range, target, stop-loss, and bull/base/bear scenarios.
```

## Slash command style pattern

```text
/nse-investment-advisor give me personalized NSE stock recommendations for my risk profile and include a full deep dive on KCB
```
