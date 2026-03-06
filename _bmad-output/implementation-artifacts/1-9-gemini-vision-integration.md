---
story_id: "1.9"
story_key: "1-9-gemini-vision-integration"
epic: 1
status: done
created: "2026-03-06"
author: "Ahmed"
---

# Story 1.9: Gemini Vision Integration

## Story Information

| Field | Value |
|-------|-------|
| **Epic** | Epic 1: Core Scan Experience (End-to-End MVP) |
| **Story ID** | 1.9 |
| **Story Key** | 1-9-gemini-vision-integration |
| **Status** | done |
| **Priority** | Critical - Primary AI Provider |
| **Estimation** | 2-3 hours |
| **Dependencies** | Story 1.8 (✅ Worker /analyze Endpoint) |

## User Story

**As a** developer,
**I want** Gemini 2.5 Flash integrated as the primary AI provider,
**So that** fill level estimates are fast and accurate.

## Acceptance Criteria

### Primary AC

**Given** the Worker receives a valid /analyze request
**When** the Worker calls Gemini API
**Then**:
1. The request uses Gemini 2.5 Flash model (`gemini-2.5-flash-latest`)
2. The request includes the structured JSON prompt for fill estimation
3. The request sets `thinkingBudget: 0` for speed
4. The response is parsed for `fillPercentage` (0-100) and `confidence` (high/medium/low)
5. The Worker returns the parsed result to the client
6. The round-trip completes in under 8 seconds (p95)

### Technical Requirements

**Gemini API Configuration:**
```typescript
const MODEL = "gemini-2.5-flash-latest";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Request structure
{
  system_instruction: {
    parts: [{ text: SYSTEM_PROMPT }]
  },
  contents: [{
    role: "user",
    parts: [
      { text: userMessage },
      { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }
    ]
  }],
  generationConfig: {
    temperature: 0.1,
    responseMimeType: "application/json",
    thinkingConfig: { thinkingBudget: 0 }
  }
}
```

**System Prompt:**
```
You are an expert computer vision system specialized in analyzing cooking oil bottles to estimate fill levels.

Your task: Analyze the provided image of a clear glass oil bottle and estimate the remaining fill level as a percentage (0-100%).

Guidelines:
- 0% = completely empty bottle
- 100% = completely full bottle
- Estimate based on visible oil level relative to total bottle height
- Account for meniscus (curved surface) at the top of the oil
- Ignore bottle cap, label, or external features
- Focus only on the liquid level inside the bottle

Also assess:
- Confidence level: "high" (clear view, good lighting), "medium" (acceptable but not ideal), "low" (poor quality, recommend retake)
- Image quality issues: blur, poor lighting, obstruction, reflection, or other problems

Return your analysis as JSON with this exact structure:
{
  "fillPercentage": <number 0-100>,
  "confidence": "<high|medium|low>",
  "imageQualityIssues": [<optional array of strings>],
  "reasoning": "<brief explanation of your estimate>"
}
```

**User Message Template:**
```
Analyze this oil bottle image and estimate the fill level.

Bottle context:
- SKU: {sku}
- Bottle type: {name}
- Total capacity: {totalVolumeMl}ml
- Shape: {shape}

Provide your analysis as JSON.
```

### Response Parsing

**Validation:**
```typescript
// Validate fillPercentage
if (
  typeof parsed.fillPercentage !== "number" ||
  parsed.fillPercentage < 0 ||
  parsed.fillPercentage > 100
) {
  throw new Error("Invalid fillPercentage in LLM response");
}

// Validate confidence
if (!["high", "medium", "low"].includes(parsed.confidence as string)) {
  throw new Error("Invalid confidence in LLM response");
}
```

**Return Format:**
```typescript
return {
  fillPercentage: Math.round(parsed.fillPercentage as number),
  confidence: parsed.confidence as "high" | "medium" | "low",
  imageQualityIssues: Array.isArray(parsed.imageQualityIssues)
    ? (parsed.imageQualityIssues as string[])
    : [],
  reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : undefined,
};
```

### Performance Requirements

**Latency Targets:**
- NFR4: Photo-to-result round-trip (p95) < 8 seconds
- Gemini API call: 2-4 seconds (typical)
- Total /analyze endpoint: 3-5 seconds (including validation, storage)

**Why Gemini 2.5 Flash?**
- Fast inference (Flash optimized for speed)
- Vision capabilities (multimodal)
- JSON output mode (structured responses)
- Cost-effective for POC scale

## Implementation Details

### API Integration

File: `worker/src/providers/gemini.ts`

```typescript
export async function callGemini(
  imageBase64: string,
  bottle: BottleEntry,
  apiKey: string
): Promise<LLMResponse> {
  const userMessage = `Analyze this oil bottle image and estimate the fill level.

Bottle context:
- SKU: ${bottle.sku}
- Bottle type: ${bottle.name}
- Total capacity: ${bottle.totalVolumeMl}ml
- Shape: ${bottle.geometry.shape}

Provide your analysis as JSON.`;

  const requestBody = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: "user",
        parts: [
          { text: userMessage },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  const url = `${GEMINI_API_BASE}/${MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  return parseLLMResponse(text);
}
```

### Error Handling

**API Errors:**
```typescript
if (!res.ok) {
  const text = await res.text();
  throw new Error(`Gemini API error ${res.status}: ${text}`);
}
```

**Empty Response:**
```typescript
if (!text) {
  throw new Error("Gemini returned empty response");
}
```

**Invalid JSON:**
```typescript
try {
  const parsed = JSON.parse(raw);
} catch (e) {
  throw new Error("Invalid JSON in LLM response");
}
```

**Validation Errors:**
```typescript
if (typeof parsed.fillPercentage !== "number") {
  throw new Error("Invalid fillPercentage in LLM response");
}
```

### Load Balancing

**Multiple API Keys:**
```typescript
// In analyze.ts
const geminiKeys = [
  c.env.GEMINI_API_KEY,
  c.env.GEMINI_API_KEY2,
  c.env.GEMINI_API_KEY3,
].filter((k): k is string => typeof k === "string" && k.length > 0);

// Pick random key for load distribution
const geminiKey = geminiKeys[Math.floor(Math.random() * geminiKeys.length)];
```

**Benefits:**
- Distributes requests across multiple keys
- Avoids rate limits on single key
- Provides redundancy if one key fails

## Testing Requirements

### Manual Testing

**API Integration:**
- [ ] POST valid image to /analyze
- [ ] Response includes fillPercentage (0-100)
- [ ] Response includes confidence (high/medium/low)
- [ ] Response includes scanId
- [ ] Response includes latencyMs
- [ ] Response includes aiProvider: "gemini"

**Response Validation:**
- [ ] fillPercentage is integer 0-100
- [ ] confidence is one of: "high", "medium", "low"
- [ ] imageQualityIssues is array (may be empty)
- [ ] latencyMs is positive number

**Performance:**
- [ ] Typical latency: 2-4 seconds
- [ ] p95 latency: < 8 seconds
- [ ] No timeouts or errors

### Error Scenarios

**Test Cases:**
- [ ] Invalid API key - returns error
- [ ] Empty image - returns error
- [ ] Malformed base64 - returns error
- [ ] Network timeout - falls back to Groq
- [ ] API rate limit (429) - falls back to Groq
- [ ] Server error (5xx) - falls back to Groq

## Definition of Done

Per project Definition of Done:

- [x] Code follows project conventions
- [x] TypeScript types are explicit
- [x] All acceptance criteria met
- [x] Gemini API integration working
- [x] JSON response parsing validated
- [x] Error handling complete
- [x] Load balancing across keys working
- [x] Performance meets targets (<8s p95)

## Dependencies on Other Stories

**Dependencies:**
- ✅ Story 1.8 (Worker /analyze Endpoint) - Route handler
- ✅ Story 1.2 (Cloudflare Infrastructure) - Worker deployment
- ✅ Story 1.3 (Bottle Registry) - Bottle context for prompt

**Blocks:**
- Story 1.10 (Groq Fallback) - Secondary provider
- Story 4.1 (Result Display) - Shows fill percentage to user

## Files Created/Modified

### Files
- `worker/src/providers/gemini.ts` - Gemini API integration
- `worker/src/types.ts` - LLMResponse interface
- `worker/src/analyze.ts` - Integrates Gemini in /analyze route

## Status

**Status**: done
**Created**: 2026-03-06
**Last Updated**: 2026-03-06

**Gemini 2.5 Flash integration complete with JSON parsing and validation**
