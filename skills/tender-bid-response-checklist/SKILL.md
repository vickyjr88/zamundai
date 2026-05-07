---
name: tender-bid-response-checklist
description: "Turn tender summaries or source tender documents into an actionable bid response checklist with owners, dependencies, deadlines, and submission readiness gates. Use when preparing bid plans, internal handoff tasks, and execution tracking for tender submissions."
argument-hint: "Describe the tender and your bid team setup, for example: create a 10-day bid plan with owners and hard gates."
user-invocable: true
---

# Tender Bid Response Checklist

## Document Input Handling

When the user attaches a document, the API extracts its text and embeds it inline in the prompt using this format:

```
--- Document: filename.pdf ---
[full extracted text]
---
```

**The text is already present in the prompt. Do NOT say "I cannot process this file" or "no PDF model is configured".** Read the text from the inline block and use it as the tender source.

If the inline content looks like a raw tender document rather than a pre-made summary, first apply the `tender-document-summary` skill to produce a summary, then use that summary to build the checklist.

## When to Use

- Convert a tender summary into an execution checklist.
- Prepare internal bid response plans across legal, technical, commercial, and management teams.
- Identify missing artifacts before submission.
- Build a readiness gate for `Go`, `Go with conditions`, or `No-go`.

## Output Contract

- Return one checklist only.
- Use the template exactly once.
- Assign each task an owner role, due date, and dependency where possible.
- Mark unavailable details as `TBD` rather than omitting tasks.

## Procedure

1. Identify required submission artifacts.
   - Technical documents, pricing forms, declarations, CVs, legal documents, bid security, and portal requirements.
2. Convert requirements into tasks.
   - One concrete task per deliverable or approval.
3. Add ownership.
   - Use role-based owners (for example: Bid Manager, Technical Lead, Finance, Legal, HR, Delivery).
4. Sequence tasks by dependency.
   - Example: compliance document collection before final packaging.
5. Build timeline gates.
   - Draft complete, internal review, compliance review, pricing sign-off, final upload.
6. Highlight blockers.
   - Missing evidence, unclear requirement, short timelines, external dependencies.
7. End with readiness status.
   - `Ready`, `At risk`, or `Not ready`, with reasons.

## Quality Rules

- Tasks must be actionable and verifiable.
- Avoid vague tasks like "prepare documents".
- Include objective completion criteria.
- Include at least one contingency action for critical risks.
- Do not invent legal or commercial facts not present in the source.

## Recommended Structure

Use [bid response checklist template](./assets/bid-response-checklist-template.md).
For detailed conversion logic, use [checklist guidance](./references/checklist-guidance.md).
