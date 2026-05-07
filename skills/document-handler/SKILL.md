---
name: document-handler
description: "Extract and route any attached document (PDF, DOCX, TXT, CSV) to the correct downstream skill. Use this as the entry point when a user attaches a document without a slash command, or when you need to read and process document content before applying another skill."
argument-hint: "Optionally specify what you want to do with the document, for example: summarise, build a checklist, or extract key facts."
user-invocable: true
---

# Document Handler

## Purpose

This skill handles documents that arrive as inline text inside a prompt. It extracts the content and routes it to the correct downstream skill based on context.

## How document text arrives

When a user attaches a file (PDF, DOCX, TXT, CSV), the frontend extracts its text and embeds it directly in the prompt using this format:

```
--- Document: filename.pdf ---
[full extracted text of the document]
---
```

**The text is already present in the prompt. You do not need to call any tool or read any file path.**
**Do NOT say "I cannot process this file" or "no PDF model is configured".**
**Do NOT ask the user to paste the text — it is already there.**

## How images and screenshots arrive

When a user attaches an image (PNG, JPG, GIF, WEBP), it is converted to a base64 data URL client-side and embedded inline in the prompt as a standard markdown image:

```
![filename.png](data:image/png;base64,iVBORw0KGgo...)
```

**The image is already embedded in the prompt as a data URL. Do NOT say "I cannot see images" if your underlying model supports vision.**
If the model does not support vision, describe what you can infer from context and ask the user to describe the image or provide text instead.

## Step-by-step procedure

1. **Locate inline document blocks.**
   - Scan the prompt for one or more `--- Document: <filename> ---` sections.
   - Extract the full text between the opening `--- Document: <filename> ---` marker and the next `---` boundary or end of prompt.
   - If multiple documents are present, treat them as a combined package.

2. **Identify the document type.**
   Use the filename extension and content signals to classify the document:
   - Tender notice, RFP, RFQ, ITT, procurement pack → route to `tender-document-summary`
   - Bid checklist, bid plan, bid workplan → route to `tender-bid-response-checklist`
   - NSE data, stock prices, financial statement, annual report → route to `nse-investment-advisor`
   - Plain notes, meeting minutes, general text → summarise directly without routing to a specific skill
   - Screenshots or images of tender documents, forms, or financial data → treat as a tender/financial document; analyse visible content and route to the appropriate skill

3. **Check for an explicit slash command.**
   - If the user already specified a slash command (e.g. `/tender-document-summary`), honour that command and pass the extracted document text to that skill.
   - Do not reroute away from an explicit command.

4. **Apply the downstream skill.**
   - Read the target skill's `SKILL.md` from `./skills/<skill-name>/SKILL.md`.
   - Follow its procedure exactly using the extracted document text as input.
   - Return one final, complete answer in the format defined by the target skill.

5. **If no downstream skill matches.**
   - Produce a structured document summary covering: purpose, key facts, critical dates, parties, obligations, and recommended next actions.
   - Do not ask the user what they want unless truly ambiguous — default to a useful general summary.

## Quality rules

- Never refuse to process a document on the grounds that no PDF model is available.
- Never output "I cannot read attachments". The text is already extracted and in the prompt.
- Never ask the user to re-upload or paste the file manually.
- If the extracted text appears garbled or very short (under 100 characters), say: "The document appears to contain very little extractable text. It may be a scanned image. Please paste the text manually or try a different format."
- Preserve section headings and table structure where present.
- When routing to another skill, do not produce two separate outputs — produce one final answer that follows the target skill's output contract.

## Supported file types (handled by the API before reaching this skill)

| Extension | Handler |
|---|---|
| `.pdf` | pdf-parse library — extracts machine-readable PDF text |
| `.docx` | mammoth library — extracts Word document text |
| `.txt` | raw UTF-8 read |
| `.md` | raw UTF-8 read |
| `.csv` | raw UTF-8 read |
| `.png` | FileReader — base64 data URL embedded as markdown image |
| `.jpg` / `.jpeg` | FileReader — base64 data URL embedded as markdown image |
| `.gif` | FileReader — base64 data URL embedded as markdown image |
| `.webp` | FileReader — base64 data URL embedded as markdown image |

If the user attaches a file type not in this list, the API will have already rejected it before the prompt reaches you.
