/**
 * Typed error classes for LLM response parsing
 * 
 * These error classes allow callers to discriminate between different
 * failure modes when parsing LLM responses, enabling more specific
 * error handling and logging.
 */

/**
 * Base class for LLM parsing errors
 */
export class LLMParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMParseError';
  }
}

/**
 * Thrown when the LLM response is empty after stripping markdown fences
 */
export class LLMEmptyResponseError extends LLMParseError {
  constructor() {
    super('Empty LLM response after fence stripping');
    this.name = 'LLMEmptyResponseError';
  }
}

/**
 * Thrown when the LLM response is not a valid JSON object
 */
export class LLMInvalidFormatError extends LLMParseError {
  constructor(reason: string) {
    super(reason);
    this.name = 'LLMInvalidFormatError';
  }
}
