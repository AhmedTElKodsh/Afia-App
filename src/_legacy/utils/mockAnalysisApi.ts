/**
 * Mock Analysis API
 * 
 * Generates realistic AnalysisResult objects for testing the Result UI
 * without making actual API calls.
 */

import type { AnalysisResult } from "../state/appState";

export interface MockScenario {
  id: string;
  nameKey: string;
  descriptionKey: string;
  /** Fill percentage - must be between 0 and 100 */
  fillPercentage: number;
  confidence: "high" | "medium" | "low";
  imageQualityIssues?: string[];
  /** Simulated API latency in milliseconds */
  latencyMs?: number;
}

/**
 * Predefined mock scenarios for testing various fill levels and confidence ratings.
 * 
 * Scenarios cover:
 * - High confidence: 100%, 75%, 50%, 25%, 95% (edge case)
 * - Medium confidence: 60%, 40%, 5% (edge case)
 * - Low confidence: 30%, 70% (with quality issues)
 * 
 * F18: Frozen to prevent accidental mutation
 */
export const MOCK_SCENARIOS: readonly MockScenario[] = Object.freeze([
  {
    id: "high-full",
    nameKey: "admin.mockScenarios.highFull.name",
    descriptionKey: "admin.mockScenarios.highFull.desc",
    fillPercentage: 100,
    confidence: "high",
    latencyMs: 800,
  },
  {
    id: "high-75",
    nameKey: "admin.mockScenarios.high75.name",
    descriptionKey: "admin.mockScenarios.high75.desc",
    fillPercentage: 75,
    confidence: "high",
    latencyMs: 900,
  },
  {
    id: "high-50",
    nameKey: "admin.mockScenarios.high50.name",
    descriptionKey: "admin.mockScenarios.high50.desc",
    fillPercentage: 50,
    confidence: "high",
    latencyMs: 850,
  },
  {
    id: "high-25",
    nameKey: "admin.mockScenarios.high25.name",
    descriptionKey: "admin.mockScenarios.high25.desc",
    fillPercentage: 25,
    confidence: "high",
    latencyMs: 920,
  },
  {
    id: "medium-60",
    nameKey: "admin.mockScenarios.medium60.name",
    descriptionKey: "admin.mockScenarios.medium60.desc",
    fillPercentage: 60,
    confidence: "medium",
    latencyMs: 1200,
  },
  {
    id: "medium-40",
    nameKey: "admin.mockScenarios.medium40.name",
    descriptionKey: "admin.mockScenarios.medium40.desc",
    fillPercentage: 40,
    confidence: "medium",
    imageQualityIssues: ["slight_blur"],
    latencyMs: 1400,
  },
  {
    id: "low-30",
    nameKey: "admin.mockScenarios.low30.name",
    descriptionKey: "admin.mockScenarios.low30.desc",
    fillPercentage: 30,
    confidence: "low",
    imageQualityIssues: ["blur", "poor_lighting"],
    latencyMs: 1800,
  },
  {
    id: "low-70",
    nameKey: "admin.mockScenarios.low70.name",
    descriptionKey: "admin.mockScenarios.low70.desc",
    fillPercentage: 70,
    confidence: "low",
    imageQualityIssues: ["reflection"],
    latencyMs: 2000,
  },
  {
    id: "edge-empty",
    nameKey: "admin.mockScenarios.edgeEmpty.name",
    descriptionKey: "admin.mockScenarios.edgeEmpty.desc",
    fillPercentage: 5,
    confidence: "medium",
    latencyMs: 1100,
  },
  {
    id: "edge-95",
    nameKey: "admin.mockScenarios.edge95.name",
    descriptionKey: "admin.mockScenarios.edge95.desc",
    fillPercentage: 95,
    confidence: "high",
    latencyMs: 750,
  },
] as MockScenario[]);

/**
 * Generate a mock AnalysisResult based on a scenario
 * 
 * F6: Validates input parameters
 * F13: Validates fillPercentage range
 * F14: Uses crypto.randomUUID for unique scanId
 * F16: Documents purpose and behavior
 */
export function generateMockResult(
  scenario: MockScenario,
  totalVolumeMl: number
): AnalysisResult {
  // F6: Validate totalVolumeMl
  if (!Number.isFinite(totalVolumeMl) || totalVolumeMl <= 0) {
    throw new Error(`Invalid totalVolumeMl: ${totalVolumeMl}. Must be a positive number.`);
  }

  // F13: Validate fillPercentage range
  if (scenario.fillPercentage < 0 || scenario.fillPercentage > 100) {
    throw new Error(`Invalid fillPercentage: ${scenario.fillPercentage}. Must be between 0 and 100.`);
  }

  const remainingMl = Math.round((scenario.fillPercentage / 100) * totalVolumeMl);
  
  // F14: Use crypto.randomUUID for unique scanId
  const uniqueId = crypto.randomUUID();
  
  return {
    scanId: `mock_${scenario.id}_${uniqueId}`,
    fillPercentage: scenario.fillPercentage,
    remainingMl,
    confidence: scenario.confidence,
    aiProvider: "mock-api", // F7: Changed from "local-cnn" to clearly distinguish mock results
    latencyMs: scenario.latencyMs || 1000,
    imageQualityIssues: scenario.imageQualityIssues,
  };
}

/**
 * Simulate API call with realistic delay
 * 
 * F2: Returns cleanup function to prevent memory leaks
 * F8: Can simulate errors via special scenario IDs
 * F16: Documents behavior and error simulation
 * 
 * @throws Error if scenario.id is "error-*" (for testing error handling)
 */
export async function mockAnalyzeBottle(
  scenario: MockScenario,
  totalVolumeMl: number,
  signal?: AbortSignal
): Promise<AnalysisResult> {
  // F8: Simulate API errors for testing
  if (scenario.id.startsWith('error-')) {
    throw new Error(`Simulated API error: ${scenario.descriptionKey}`);
  }

  const latency = scenario.latencyMs || 1000;
  
  // F2: Support AbortSignal to prevent memory leaks
  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(resolve, latency);
    
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Mock API call aborted'));
      });
    }
  });
  
  return generateMockResult(scenario, totalVolumeMl);
}

/**
 * Get scenario by ID
 */
export function getScenarioById(id: string): MockScenario | undefined {
  return MOCK_SCENARIOS.find(s => s.id === id);
}

/**
 * Get scenarios grouped by confidence level
 */
export function getScenariosByConfidence(): Record<string, MockScenario[]> {
  return {
    high: MOCK_SCENARIOS.filter(s => s.confidence === "high"),
    medium: MOCK_SCENARIOS.filter(s => s.confidence === "medium"),
    low: MOCK_SCENARIOS.filter(s => s.confidence === "low"),
  };
}
