import type { Context } from "hono";
import type { Env, Variables } from "./types.ts";
import { MonitoringLogger } from "./monitoring/logger.ts";

export async function handleErrorTelemetry(c: Context<{ Bindings: Env; Variables: Variables }>): Promise<Response> {
  const logger = new MonitoringLogger(c.env.BETTERSTACK_TOKEN);
  const body = await c.req.json<{
    sku: string;
    error: string;
    timestamp: string;
    deviceInfo?: string;
  }>();

  await logger.error(`Client Scan Error: ${body.sku}`, {
    error: body.error,
    clientTimestamp: body.timestamp,
    deviceInfo: body.deviceInfo,
    requestId: c.get("requestId")
  });

  return c.json({ status: "ok" });
}
