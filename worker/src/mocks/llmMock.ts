/**
 * Mock LLM responses for local testing
 * Enable with ENABLE_MOCK_LLM=true in .dev.vars
 * 
 * Provides deterministic responses based on SKU for testing without API keys.
 * Supports both Gemini and Groq mock responses.
 */

export interface MockLLMResponse {
  fillPercentage: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  red_line_y_normalized?: number;
  imageQualityIssues?: string[];
}

/**
 * Mock Gemini API response with deterministic results based on SKU
 * @param imageBase64 - Base64 encoded image (not used in mock, but kept for API compatibility)
 * @param sku - Product SKU to determine mock response
 * @returns Mock LLM response matching the expected format
 */
export function mockGeminiResponse(imageBase64: string, sku: string): MockLLMResponse {
  // Deterministic responses based on SKU for testing
  const mockResponses: Record<string, MockLLMResponse> = {
    'afia-corn-1.5l': {
      fillPercentage: 75,
      confidence: 'high',
      reasoning: 'Mock: Detected Afia corn oil 1.5L bottle at 75% fill level',
      red_line_y_normalized: 0.25,
    },
    'afia-corn-oil-1.8l': {
      fillPercentage: 75,
      confidence: 'high',
      reasoning: 'Mock: Detected Afia corn oil bottle at 75% fill level',
      red_line_y_normalized: 0.25,
    },
    'afia-sunflower-oil-1.8l': {
      fillPercentage: 50,
      confidence: 'high',
      reasoning: 'Mock: Detected Afia sunflower oil bottle at 50% fill level',
      red_line_y_normalized: 0.50,
    },
    'afia-vegetable-oil-1.8l': {
      fillPercentage: 90,
      confidence: 'high',
      reasoning: 'Mock: Detected Afia vegetable oil bottle at 90% fill level',
      red_line_y_normalized: 0.10,
    },
    'afia-corn-oil-750ml': {
      fillPercentage: 30,
      confidence: 'medium',
      reasoning: 'Mock: Detected Afia corn oil 750ml bottle at 30% fill level',
      red_line_y_normalized: 0.70,
    },
    'afia-corn-2.5l': {
      fillPercentage: 50,
      confidence: 'high',
      reasoning: 'Mock: Detected Afia corn oil 2.5L bottle at 50% fill level',
      red_line_y_normalized: 0.50,
    },
    'default': {
      fillPercentage: 60,
      confidence: 'medium',
      reasoning: 'Mock: Default response for testing',
      red_line_y_normalized: 0.40,
    }
  };

  return mockResponses[sku] || mockResponses['default'];
}

/**
 * Mock Groq API response (fallback provider)
 * @param imageBase64 - Base64 encoded image (not used in mock, but kept for API compatibility)
 * @param sku - Product SKU to determine mock response
 * @returns Mock LLM response with slightly different values to distinguish from Gemini
 */
export function mockGroqResponse(imageBase64: string, sku: string): MockLLMResponse {
  // Groq fallback mock with slightly different values
  return {
    fillPercentage: 65,
    confidence: 'medium',
    reasoning: 'Mock: Groq fallback response for testing',
    red_line_y_normalized: 0.35,
  };
}

/**
 * Mock OpenRouter API response (fallback provider)
 * @param imageBase64 - Base64 encoded image (not used in mock, but kept for API compatibility)
 * @param sku - Product SKU to determine mock response
 * @returns Mock LLM response
 */
export function mockOpenRouterResponse(imageBase64: string, sku: string): MockLLMResponse {
  return {
    fillPercentage: 70,
    confidence: 'medium',
    reasoning: 'Mock: OpenRouter fallback response for testing',
    red_line_y_normalized: 0.30,
  };
}

/**
 * Mock Mistral API response (fallback provider)
 * @param imageBase64 - Base64 encoded image (not used in mock, but kept for API compatibility)
 * @param sku - Product SKU to determine mock response
 * @returns Mock LLM response
 */
export function mockMistralResponse(imageBase64: string, sku: string): MockLLMResponse {
  return {
    fillPercentage: 55,
    confidence: 'low',
    reasoning: 'Mock: Mistral fallback response for testing',
    red_line_y_normalized: 0.45,
  };
}
