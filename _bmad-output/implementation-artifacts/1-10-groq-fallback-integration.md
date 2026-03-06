---
story_id: "1.10"
story_key: "1-10-groq-fallback-integration"
epic: 1
status: done
created: "2026-03-06"
author: "Ahmed"
---

# Story 1.10: Groq Fallback Integration

## Story Information

| Field | Value |
|-------|-------|
| **Epic** | Epic 1: Core Scan Experience (End-to-End MVP) |
| **Story ID** | 1.10 |
| **Story Key** | 1-10-groq-fallback-integration |
| **Status** | done |
| **Priority** | High - Reliability |
| **Estimation** | 1-2 hours |
| **Dependencies** | Story 1.8 (✅ Worker /analyze), Story 1.9 (✅ Gemini Integration) |

## User Story

**As a** developer,
**I want** Groq + Llama 4 Scout as automatic fallback,
**So that** the app remains functional when Gemini is unavailable.

## Acceptance Criteria

### Primary AC

**Given** the Worker attempts to call Gemini API
**When** Gemini returns 429 (rate limit) or 5xx (server error)
**Then**:
1. The Worker automatically retries with Groq API
2. The Groq request uses Llama 4 Scout model (`meta-llama/llama-4-scout-17b-16e-instruct`)
3. The Groq request uses the same structured JSON prompt
4. The response is parsed identically to Gemini
5. The fallback happens transparently without user action
6. The metadata records which provider was used (`aiProvider: "groq"`)

### Implementation Details

**Fallback Logic:**
```typescript
try {
  llmResult = await callGemini(body.imageBase64, bottle, geminiKey);
  aiProvider = "gemini";
} catch (geminiError) {
  console.warn("Gemini failed, falling back to Groq:", geminiError);
  aiProvider = "groq";
  llmResult = await callGroq(body.imageBase64, bottle, c.env.GROQ_API_KEY);
}
```

**When Fallback Triggers:**
- Gemini API returns 429 (rate limit exceeded)
- Gemini API returns 5xx (server error)
- Gemini API times out
- Gemini returns invalid response

**Groq Configuration:**
```typescript
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Same system prompt as Gemini
// Same JSON response format
// Same validation logic
```

## Status

**Status**: done
**Created**: 2026-03-06
**Last Updated**: 2026-03-06

**Groq fallback implemented and integrated with /analyze endpoint**
