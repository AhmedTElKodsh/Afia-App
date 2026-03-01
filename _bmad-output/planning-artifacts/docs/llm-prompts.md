# LLM Prompts — Safi Oil Tracker

**Version:** POC v1

---

## Gemini 2.5 Flash Prompt

**Model:** `gemini-2.5-flash-latest`
**Configuration:**

- `thinkingBudget: 0` (disable extended thinking for speed)
- `response_mime_type: "application/json"`
- `temperature: 0.1` (low temperature for consistency)

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

**User Message:**

```
Analyze this oil bottle image and estimate the fill level.

Bottle context:
- SKU: {sku}
- Bottle type: {bottleName}
- Total capacity: {totalVolumeMl}ml
- Shape: {shape}

Provide your analysis as JSON.
```

**Example Request (TypeScript):**

```typescript
const geminiRequest = {
  model: "gemini-2.5-flash-latest",
  contents: [
    {
      role: "user",
      parts: [
        {
          text: `Analyze this oil bottle image and estimate the fill level.

Bottle context:
- SKU: filippo-berio-500ml
- Bottle type: Filippo Berio Extra Virgin Olive Oil 500ml
- Total capacity: 500ml
- Shape: cylinder

Provide your analysis as JSON.`,
        },
        {
          inline_data: {
            mime_type: "image/jpeg",
            data: "<base64-encoded-image>",
          },
        },
      ],
    },
  ],
  generationConfig: {
    response_mime_type: "application/json",
    temperature: 0.1,
  },
  thinkingBudget: 0,
};
```

**Example Response:**

```json
{
  "fillPercentage": 68,
  "confidence": "high",
  "imageQualityIssues": [],
  "reasoning": "Clear view of oil level at approximately 68% of bottle height. Good lighting, minimal reflection, clear meniscus visible."
}
```

---

## Groq Llama 4 Scout Prompt

**Model:** `llama-4-scout`
**Configuration:**

- `temperature: 0.1`
- `max_tokens: 500`
- `response_format: { type: "json_object" }`

**System Prompt:**

```
You are a computer vision expert analyzing cooking oil bottles to estimate fill levels.

Task: Estimate the remaining oil as a percentage (0-100%) where 0% is empty and 100% is full.

Consider:
- Visible liquid level relative to total bottle height
- Meniscus curve at oil surface
- Ignore cap, label, external features

Assess confidence:
- "high": Clear view, good lighting
- "medium": Acceptable quality
- "low": Poor quality, recommend retake

Identify image quality issues: blur, poor_lighting, obstruction, reflection

Return JSON:
{
  "fillPercentage": <0-100>,
  "confidence": "<high|medium|low>",
  "imageQualityIssues": [<optional strings>],
  "reasoning": "<brief explanation>"
}
```

**User Message:**

```
Analyze this oil bottle image.

Context:
- SKU: {sku}
- Bottle: {bottleName}
- Capacity: {totalVolumeMl}ml
- Shape: {shape}

Estimate fill level as JSON.
```

**Example Request (OpenAI-compatible API):**

```typescript
const groqRequest = {
  model: "llama-4-scout",
  messages: [
    {
      role: "system",
      content: "<system prompt from above>",
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Analyze this oil bottle image.

Context:
- SKU: filippo-berio-500ml
- Bottle: Filippo Berio Extra Virgin Olive Oil 500ml
- Capacity: 500ml
- Shape: cylinder

Estimate fill level as JSON.`,
        },
        {
          type: "image_url",
          image_url: {
            url: "data:image/jpeg;base64,<base64-encoded-image>",
          },
        },
      ],
    },
  ],
  temperature: 0.1,
  max_tokens: 500,
  response_format: { type: "json_object" },
};
```

---

## Ollama Qwen2.5-VL Prompt (Local Dev Only)

**Model:** `qwen2.5-vl:7b`
**Configuration:**

- `temperature: 0.1`
- `num_predict: 500`

**Note:** This is for local development only. Not deployed to Worker.

**Prompt:**

```
Analyze this cooking oil bottle image and estimate the fill level.

Return JSON with:
- fillPercentage (0-100)
- confidence (high/medium/low)
- imageQualityIssues (array of strings)
- reasoning (brief explanation)

Bottle context:
- SKU: {sku}
- Type: {bottleName}
- Capacity: {totalVolumeMl}ml
- Shape: {shape}
```

**Example Request:**

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5-vl:7b",
  "prompt": "<prompt from above>",
  "images": ["<base64-encoded-image>"],
  "stream": false,
  "options": {
    "temperature": 0.1,
    "num_predict": 500
  }
}'
```

---

## Response Parsing

**Worker Response Handler:**

```typescript
interface LLMResponse {
  fillPercentage: number;
  confidence: "high" | "medium" | "low";
  imageQualityIssues?: string[];
  reasoning?: string;
}

function parseLLMResponse(rawResponse: string): LLMResponse {
  try {
    const parsed = JSON.parse(rawResponse);

    // Validate required fields
    if (
      typeof parsed.fillPercentage !== "number" ||
      parsed.fillPercentage < 0 ||
      parsed.fillPercentage > 100
    ) {
      throw new Error("Invalid fillPercentage");
    }

    if (!["high", "medium", "low"].includes(parsed.confidence)) {
      throw new Error("Invalid confidence level");
    }

    return {
      fillPercentage: Math.round(parsed.fillPercentage),
      confidence: parsed.confidence,
      imageQualityIssues: parsed.imageQualityIssues || [],
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error.message}`);
  }
}
```

---

## Prompt Engineering Notes

**Why JSON mode:**

- Structured output is easier to parse and validate
- Reduces hallucination risk (LLM can't add extra commentary)
- Enables strict schema validation

**Why low temperature (0.1):**

- Consistency across multiple scans of the same bottle
- Reduces randomness in percentage estimates
- More deterministic behavior for POC validation

**Why thinkingBudget: 0 for Gemini:**

- Extended thinking adds 2-5 seconds of latency
- POC prioritizes speed over marginal accuracy gains
- Can be re-enabled in Phase 2 if accuracy is insufficient

**Why bottle context in prompt:**

- Helps LLM understand expected bottle shape
- Provides semantic context (e.g., "500ml" suggests typical bottle size)
- May improve accuracy for edge cases (very full/empty bottles)

**Confidence calibration:**

- "high": LLM is confident, user should trust the estimate
- "medium": Estimate is reasonable but not perfect, show disclaimer
- "low": Trigger retake prompt, don't show result as final

**Image quality issues:**

- Used to provide actionable feedback to user
- "blur" → "Hold phone steady and retake"
- "poor_lighting" → "Try better lighting and retake"
- "obstruction" → "Ensure bottle is fully visible and retake"
