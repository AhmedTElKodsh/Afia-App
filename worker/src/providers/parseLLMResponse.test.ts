import { describe, it, expect } from 'vitest';
import { parseLLMResponse } from './parseLLMResponse';

describe('parseLLMResponse', () => {
  it('should parse valid JSON response', () => {
    const raw = '{"brand": "Afia", "fillPercentage": 45, "confidence": "high", "reasoning": "Visible line"}';
    const result = parseLLMResponse(raw);
    expect(result.brand).toBe('Afia');
    expect(result.fillPercentage).toBe(45);
    expect(result.confidence).toBe('high');
    expect(result.reasoning).toBe('Visible line');
  });

  it('should parse JSON wrapped in markdown fences', () => {
    const raw = 'Here is the result:\n```json\n{"brand": "unknown", "fillPercentage": 72, "confidence": "medium", "imageQualityIssues": ["glare"]}\n```';
    const result = parseLLMResponse(raw);
    expect(result.brand).toBe('unknown');
    expect(result.fillPercentage).toBe(72);
    expect(result.confidence).toBe('medium');
    expect(result.imageQualityIssues).toEqual(['glare']);
  });

  it('should throw error for invalid JSON', () => {
    const raw = 'Not JSON at all';
    expect(() => parseLLMResponse(raw)).toThrow();
  });

  it('should throw error for missing required fields', () => {
    const raw = '{"confidence": "high"}';
    expect(() => parseLLMResponse(raw)).toThrow('Invalid fillPercentage in LLM response');
  });

  it('should throw error for invalid confidence values', () => {
    const raw = '{"fillPercentage": 50, "confidence": "sure"}';
    expect(() => parseLLMResponse(raw)).toThrow('Invalid confidence in LLM response');
  });

  it('should round fillPercentage to nearest integer', () => {
    const raw = '{"fillPercentage": 45.7, "confidence": "high"}';
    const result = parseLLMResponse(raw);
    expect(result.fillPercentage).toBe(46);
  });
});
