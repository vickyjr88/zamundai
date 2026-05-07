---
name: tender-document-summary
description: "Summarize tender documents, RFPs, RFQs, bids, procurement packs, and invitation-to-tender files. Use when extracting scope, deadlines, eligibility, submission requirements, evaluation criteria, risks, and a go or no-go recommendation from one or more tender documents."
argument-hint: "Describe the tender package and what level of summary you want, for example: executive summary, compliance matrix, red flags, or bid/no-bid recommendation."
user-invocable: true
---

# Tender Document Summary

## Document Input Handling

When the user attaches a document, the API extracts its text and embeds it inline in the prompt using this format:

```
--- Document: filename.pdf ---
[full extracted text]
---
```

**The text is already present in the prompt. Do NOT say "I cannot process this file" or "no PDF model is configured".** Read the text from the inline block and proceed directly with the summary procedure.

If multiple `--- Document: --- ` blocks are present, treat them as one combined tender package.

## When to Use

- Summarize tender documents, RFPs, RFQs, EOIs, ITTs, and procurement packs.
- Extract deadlines, deliverables, eligibility, mandatory requirements, and evaluation criteria.
- Produce a bid or no-bid recommendation.
- Build a concise briefing for leadership, sales, delivery, legal, or procurement teams.
- Compare multiple tender documents or appendices in one package.

## Output Contract

- Return one final answer only.
- Do not emit duplicate summaries.
- Do not ask follow-up questions when enough information is already present.
- If the user gave all key facts, produce the final summary immediately.
- If critical fields are missing, mark them as `Not stated` and continue.

## Output Goals

Produce a summary that is decision-useful, not just shorter than the source.

The final answer should usually include:

- Executive summary
- Buyer or issuer
- Opportunity scope
- Contract value or pricing notes when stated
- Submission deadline and timeline milestones
- Eligibility and mandatory compliance requirements
- Evaluation criteria and weighting when available
- Required documents and submission format
- Key risks, ambiguities, and clarification questions
- Recommended next actions
- Bid or no-bid recommendation when enough evidence exists

Use the [summary template](./assets/summary-template.md) unless the user asks for a different format.

When using the template, fill every section exactly once.

## Procedure

1. Identify the document set.
   - Note every file or section provided.
   - Distinguish the main tender notice from annexes, pricing sheets, terms, and technical appendices.
2. Determine the user's goal.
   - Default to an executive summary plus compliance and risk review.
   - If the user asks for a legal, technical, commercial, or management view, bias the summary toward that audience.
3. Extract high-signal facts first.
   - Buyer name, tender title, reference number, geography, sector, deadline, contract duration, budget, lot structure, and submission route.
4. Separate mandatory requirements from descriptive background.
   - Flag must-have criteria such as registrations, certifications, prior experience thresholds, bid bonds, signed forms, and formatting rules.
5. Extract evaluation logic.
   - Capture scoring criteria, weights, pass-fail gates, disqualification triggers, and evidence required for each criterion.
6. Surface execution risk.
   - Highlight unrealistic timelines, vague scope, missing pricing assumptions, onerous liabilities, staffing requirements, penalties, or contradictory instructions.
7. Summarize with traceability.
   - When possible, mention the section heading or document title that supports each critical conclusion.
8. End with a recommendation.
   - State `Bid`, `Bid with caution`, `Needs clarification`, or `No bid`.
   - Explain the recommendation in 2 to 5 concrete reasons.

## Duplicate-avoidance rules

- Never output both a draft and a final version in the same response.
- Never repeat the same section twice with different wording.
- If you revise, replace the previous text instead of appending a second copy.
- Prefer one complete structured output over multiple partial outputs.

## Quality Rules

- Prefer precise extraction over vague paraphrase.
- Do not invent budgets, dates, or criteria.
- If a fact is missing, say `Not stated`.
- If instructions conflict across documents, call that out explicitly.
- Keep the executive summary brief, but make the compliance and risk sections specific.
- If the package is long, first give a concise leadership summary, then a detailed breakdown.
- If the user provides multiple files, merge duplicates and point out inconsistencies.

## Special Cases

### For bid/no-bid decisions

Prioritize:

- Strategic fit
- Eligibility certainty
- Delivery feasibility
- Margin or pricing constraints
- Liability and contract risk
- Submission complexity
- Probability of winning based on stated criteria

### For internal handoff summaries

Prioritize:

- What each team must prepare
- Hard deadlines
- Required attachments
- Open questions needing clarification from the issuer

### For clarification support

Convert ambiguities into a short list of issuer questions.

## Recommended Structure

Use the [summary template](./assets/summary-template.md).
For extra rigor, consult the [extraction checklist](./references/extraction-checklist.md).
