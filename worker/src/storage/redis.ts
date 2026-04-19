/**
 * Simple Redis client for Cloudflare Workers using Upstash REST API
 */
export class RedisClient {
  constructor(
    private url: string,
    private token: string
  ) {}

  private async fetch<T>(command: any[]): Promise<T> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      throw new Error(`Redis error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json() as { result: T; error?: string };
    if (data.error) {
      throw new Error(`Redis error: ${data.error}`);
    }

    return data.result;
  }

  async get(key: string): Promise<string | null> {
    return this.fetch<string | null>(["GET", key]);
  }

  async set(key: string, value: string, options?: { ex?: number }): Promise<string> {
    const command = ["SET", key, value];
    if (options?.ex) {
      command.push("EX", options.ex.toString());
    }
    return this.fetch<string>(command);
  }

  async incr(key: string): Promise<number> {
    return this.fetch<number>(["INCR", key]);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.fetch<number>(["EXPIRE", key, seconds.toString()]);
  }

  async del(key: string): Promise<number> {
    return this.fetch<number>(["DEL", key]);
  }
}
