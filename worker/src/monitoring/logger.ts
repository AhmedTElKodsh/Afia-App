interface LogEvent {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export class MonitoringLogger {
  constructor(private token?: string) {}

  async log(event: LogEvent): Promise<void> {
    // Always log to console
    const logFn = event.level === 'error' ? console.error : event.level === 'warn' ? console.warn : console.log;
    logFn(`[${event.level.toUpperCase()}] ${event.message}`, event.metadata || {});

    // Send to Better Stack if token provided
    if (!this.token) return;

    try {
      const response = await fetch('https://in.logs.betterstack.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          dt: event.timestamp,
          level: event.level,
          message: event.message,
          ...event.metadata,
        }),
      });
      // Always consume the response body in Cloudflare Workers to avoid connection issues
      await response.text();
    } catch (error) {
      console.error('Monitoring log failed:', error);
    }
  }

  info(message: string, metadata?: Record<string, unknown>) {
    return this.log({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      metadata,
    });
  }

  warn(message: string, metadata?: Record<string, unknown>) {
    return this.log({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      metadata,
    });
  }

  error(message: string, metadata?: Record<string, unknown>) {
    return this.log({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      metadata,
    });
  }
}
