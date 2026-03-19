import { MonitoringLogger } from './logger';

export class ConsoleMonitor {
  private logger: MonitoringLogger;

  constructor(token?: string) {
    this.logger = new MonitoringLogger(token);
  }

  async logAnalysis(data: {
    scanId: string;
    sku: string;
    fillPercentage: number;
    confidence: string;
    aiProvider: string;
    latencyMs: number;
    hasQualityIssues: boolean;
  }) {
    await this.logger.info('Analysis completed', {
      metric_type: 'scan',
      ...data,
    });
  }

  async logFeedback(data: {
    scanId: string;
    accuracyRating: string;
    correctedFillPercentage?: number;
    validationStatus: string;
  }) {
    await this.logger.info('Feedback submitted', {
      metric_type: 'feedback',
      ...data,
    });
  }

  async logError(data: {
    errorType: string;
    errorMessage: string;
    sku?: string;
    latencyMs?: number;
  }) {
    await this.logger.error('Error occurred', {
      metric_type: 'error',
      ...data,
    });
  }

  async logQuotaWarning(data: {
    keyName: string;
    requestsUsed: number;
    requestsRemaining: number;
    percentUsed: string;
  }) {
    await this.logger.warn('API quota warning', {
      metric_type: 'quota',
      ...data,
    });
  }
}
