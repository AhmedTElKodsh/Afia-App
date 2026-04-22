/**
 * Tests for LLM Mock Service
 * Verifies mock responses work correctly for local testing without API keys
 */

import { describe, it, expect } from 'vitest';
import { 
  mockGeminiResponse, 
  mockGroqResponse,
  mockOpenRouterResponse,
  mockMistralResponse,
  type MockLLMResponse 
} from '../mocks/llmMock';

describe('LLM Mock Service', () => {
  describe('mockGeminiResponse', () => {
    it('returns deterministic response for afia-corn-oil-1.8l', () => {
      const result = mockGeminiResponse('fake-base64', 'afia-corn-oil-1.8l');
      
      expect(result.fillPercentage).toBe(75);
      expect(result.confidence).toBe('high');
      expect(result.reasoning).toContain('Mock: Detected Afia corn oil bottle at 75% fill level');
      expect(result.red_line_y_normalized).toBe(0.25);
    });

    it('returns deterministic response for afia-sunflower-oil-1.8l', () => {
      const result = mockGeminiResponse('fake-base64', 'afia-sunflower-oil-1.8l');
      
      expect(result.fillPercentage).toBe(50);
      expect(result.confidence).toBe('high');
      expect(result.reasoning).toContain('Mock: Detected Afia sunflower oil bottle at 50% fill level');
      expect(result.red_line_y_normalized).toBe(0.50);
    });

    it('returns deterministic response for afia-vegetable-oil-1.8l', () => {
      const result = mockGeminiResponse('fake-base64', 'afia-vegetable-oil-1.8l');
      
      expect(result.fillPercentage).toBe(90);
      expect(result.confidence).toBe('high');
      expect(result.reasoning).toContain('Mock: Detected Afia vegetable oil bottle at 90% fill level');
      expect(result.red_line_y_normalized).toBe(0.10);
    });

    it('returns deterministic response for afia-corn-oil-750ml', () => {
      const result = mockGeminiResponse('fake-base64', 'afia-corn-oil-750ml');
      
      expect(result.fillPercentage).toBe(30);
      expect(result.confidence).toBe('medium');
      expect(result.reasoning).toContain('Mock: Detected Afia corn oil 750ml bottle at 30% fill level');
      expect(result.red_line_y_normalized).toBe(0.70);
    });

    it('returns default response for unknown SKU', () => {
      const result = mockGeminiResponse('fake-base64', 'unknown-sku');
      
      expect(result.fillPercentage).toBe(60);
      expect(result.confidence).toBe('medium');
      expect(result.reasoning).toContain('Mock: Default response for testing');
      expect(result.red_line_y_normalized).toBe(0.40);
    });

    it('returns same response for same SKU (deterministic)', () => {
      const result1 = mockGeminiResponse('base64-1', 'afia-corn-oil-1.8l');
      const result2 = mockGeminiResponse('base64-2', 'afia-corn-oil-1.8l');
      
      expect(result1).toEqual(result2);
    });

    it('returns valid MockLLMResponse structure', () => {
      const result = mockGeminiResponse('fake-base64', 'afia-corn-oil-1.8l');
      
      expect(result).toHaveProperty('fillPercentage');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('red_line_y_normalized');
      expect(typeof result.fillPercentage).toBe('number');
      expect(['high', 'medium', 'low']).toContain(result.confidence);
      expect(typeof result.reasoning).toBe('string');
    });
  });

  describe('mockGroqResponse', () => {
    it('returns fallback response with distinct values', () => {
      const result = mockGroqResponse('fake-base64', 'any-sku');
      
      expect(result.fillPercentage).toBe(65);
      expect(result.confidence).toBe('medium');
      expect(result.reasoning).toContain('Mock: Groq fallback response for testing');
      expect(result.red_line_y_normalized).toBe(0.35);
    });

    it('returns same response regardless of SKU', () => {
      const result1 = mockGroqResponse('base64-1', 'sku-1');
      const result2 = mockGroqResponse('base64-2', 'sku-2');
      
      expect(result1).toEqual(result2);
    });

    it('returns valid MockLLMResponse structure', () => {
      const result = mockGroqResponse('fake-base64', 'any-sku');
      
      expect(result).toHaveProperty('fillPercentage');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('red_line_y_normalized');
    });
  });

  describe('mockOpenRouterResponse', () => {
    it('returns fallback response with distinct values', () => {
      const result = mockOpenRouterResponse('fake-base64', 'any-sku');
      
      expect(result.fillPercentage).toBe(70);
      expect(result.confidence).toBe('medium');
      expect(result.reasoning).toContain('Mock: OpenRouter fallback response for testing');
      expect(result.red_line_y_normalized).toBe(0.30);
    });

    it('returns valid MockLLMResponse structure', () => {
      const result = mockOpenRouterResponse('fake-base64', 'any-sku');
      
      expect(result).toHaveProperty('fillPercentage');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('red_line_y_normalized');
    });
  });

  describe('mockMistralResponse', () => {
    it('returns fallback response with distinct values', () => {
      const result = mockMistralResponse('fake-base64', 'any-sku');
      
      expect(result.fillPercentage).toBe(55);
      expect(result.confidence).toBe('low');
      expect(result.reasoning).toContain('Mock: Mistral fallback response for testing');
      expect(result.red_line_y_normalized).toBe(0.45);
    });

    it('returns valid MockLLMResponse structure', () => {
      const result = mockMistralResponse('fake-base64', 'any-sku');
      
      expect(result).toHaveProperty('fillPercentage');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('red_line_y_normalized');
    });
  });

  describe('Provider Differentiation', () => {
    it('each provider returns different values for easy debugging', () => {
      const gemini = mockGeminiResponse('base64', 'unknown-sku');
      const groq = mockGroqResponse('base64', 'unknown-sku');
      const openrouter = mockOpenRouterResponse('base64', 'unknown-sku');
      const mistral = mockMistralResponse('base64', 'unknown-sku');
      
      // All should have different fill percentages
      const fillPercentages = [
        gemini.fillPercentage,
        groq.fillPercentage,
        openrouter.fillPercentage,
        mistral.fillPercentage
      ];
      
      const uniqueValues = new Set(fillPercentages);
      expect(uniqueValues.size).toBe(4); // All different
    });

    it('reasoning strings identify the provider', () => {
      const gemini = mockGeminiResponse('base64', 'unknown-sku');
      const groq = mockGroqResponse('base64', 'unknown-sku');
      const openrouter = mockOpenRouterResponse('base64', 'unknown-sku');
      const mistral = mockMistralResponse('base64', 'unknown-sku');
      
      expect(gemini.reasoning).toContain('Default response');
      expect(groq.reasoning).toContain('Groq');
      expect(openrouter.reasoning).toContain('OpenRouter');
      expect(mistral.reasoning).toContain('Mistral');
    });
  });

  describe('Data Validation', () => {
    it('fill percentages are within valid range (0-100)', () => {
      const skus = [
        'afia-corn-oil-1.8l',
        'afia-sunflower-oil-1.8l',
        'afia-vegetable-oil-1.8l',
        'afia-corn-oil-750ml',
        'unknown-sku'
      ];
      
      skus.forEach(sku => {
        const result = mockGeminiResponse('base64', sku);
        expect(result.fillPercentage).toBeGreaterThanOrEqual(0);
        expect(result.fillPercentage).toBeLessThanOrEqual(100);
      });
    });

    it('red_line_y_normalized is within valid range (0-1)', () => {
      const skus = [
        'afia-corn-oil-1.8l',
        'afia-sunflower-oil-1.8l',
        'afia-vegetable-oil-1.8l',
        'afia-corn-oil-750ml',
        'unknown-sku'
      ];
      
      skus.forEach(sku => {
        const result = mockGeminiResponse('base64', sku);
        expect(result.red_line_y_normalized).toBeGreaterThanOrEqual(0);
        expect(result.red_line_y_normalized).toBeLessThanOrEqual(1);
      });
    });

    it('confidence values are valid enum values', () => {
      const validConfidences = ['high', 'medium', 'low'];
      
      const gemini = mockGeminiResponse('base64', 'unknown-sku');
      const groq = mockGroqResponse('base64', 'unknown-sku');
      const openrouter = mockOpenRouterResponse('base64', 'unknown-sku');
      const mistral = mockMistralResponse('base64', 'unknown-sku');
      
      expect(validConfidences).toContain(gemini.confidence);
      expect(validConfidences).toContain(groq.confidence);
      expect(validConfidences).toContain(openrouter.confidence);
      expect(validConfidences).toContain(mistral.confidence);
    });
  });
});
