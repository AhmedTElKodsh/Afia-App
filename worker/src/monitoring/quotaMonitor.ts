import { MonitoringLogger } from './logger';

interface QuotaStatus {
  keyName: string;
  requestsUsed: number;
  requestsRemaining: number;
  percentUsed: number;
}

export class QuotaMonitor {
  private readonly DAILY_LIMIT = 1500; // Gemini free tier

  constructor(
    private logger: MonitoringLogger,
    private kv: KVNamespace
  ) {}

  async trackRequest(keyName: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const key = `quota:${keyName}:${today}`;
    
    const current = await this.kv.get(key);
    const count = current ? parseInt(current) + 1 : 1;
    await this.kv.put(key, count.toString(), {
      expirationTtl: 86400 * 2,
    });

    const percentUsed = (count / this.DAILY_LIMIT) * 100;

    if (percentUsed >= 95 && count % 10 === 0) {
      await this.logger.error('API quota critical', {
        keyName,
        requestsUsed: count,
        requestsRemaining: this.DAILY_LIMIT - count,
        percentUsed: percentUsed.toFixed(1),
      });
    } else if (percentUsed >= 90 && count % 50 === 0) {
      await this.logger.warn('API quota high', {
        keyName,
        requestsUsed: count,
        requestsRemaining: this.DAILY_LIMIT - count,
        percentUsed: percentUsed.toFixed(1),
      });
    } else if (percentUsed >= 80 && count % 100 === 0) {
      await this.logger.info('API quota warning', {
        keyName,
        requestsUsed: count,
        requestsRemaining: this.DAILY_LIMIT - count,
        percentUsed: percentUsed.toFixed(1),
      });
    }
  }

  async getStatus(keyName: string): Promise<QuotaStatus> {
    const today = new Date().toISOString().split('T')[0];
    const key = `quota:${keyName}:${today}`;
    const count = await this.kv.get(key);
    const requestsUsed = count ? parseInt(count) : 0;

    return {
      keyName,
      requestsUsed,
      requestsRemaining: this.DAILY_LIMIT - requestsUsed,
      percentUsed: (requestsUsed / this.DAILY_LIMIT) * 100,
    };
  }
}
