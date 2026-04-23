import type { Env } from "./types.ts";

/**
 * Security Utility for Worker
 * Handles signing and verification of admin session tokens with secret rotation support.
 */

export interface SessionPayload {
  expiresAt: number;
  nonce: string;
}

/**
 * Get all available JWT secrets from environment
 * Supports rotation via comma-separated ADMIN_JWT_SECRETS
 */
function getSecrets(env: Env): string[] {
  const secrets: string[] = [];
  
  if (env.ADMIN_JWT_SECRETS) {
    secrets.push(...env.ADMIN_JWT_SECRETS.split(",").map(s => s.trim()).filter(Boolean));
  }
  
  if (env.ADMIN_JWT_SECRET) {
    secrets.push(env.ADMIN_JWT_SECRET.trim());
  }

  // Backward-compatible fallback so existing deployments that only set
  // ADMIN_PASSWORD do not fail authentication token issuance.
  if (env.ADMIN_PASSWORD) {
    secrets.push(env.ADMIN_PASSWORD.trim());
  }
  
  return Array.from(new Set(secrets)); // De-duplicate
}

/**
 * Sign a session token using the primary (first) secret
 */
export async function signToken(payload: string, env: Env): Promise<string> {
  const secrets = getSecrets(env);
  if (secrets.length === 0) {
    throw new Error("No signing secrets configured");
  }
  
  const primarySecret = secrets[0];
  const encoder = new TextEncoder();
  const keyData = encoder.encode(primarySecret);
  
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const b64Payload = btoa(payload);
  const b64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  return `${b64Payload}.${b64Signature}`;
}

/**
 * Verify a session token against all available secrets
 */
export async function verifyToken(token: string, env: Env): Promise<SessionPayload | null> {
  const dotIdx = token.indexOf(".");
  if (dotIdx === -1) return null;

  const b64Payload = token.substring(0, dotIdx);
  const b64Signature = token.substring(dotIdx + 1);

  try {
    const payloadStr = atob(b64Payload);
    const payload = JSON.parse(payloadStr) as SessionPayload;
    
    if (typeof payload.expiresAt !== "number" || payload.expiresAt <= Date.now()) {
      return null;
    }

    const secrets = getSecrets(env);
    if (secrets.length === 0) return null;

    const encoder = new TextEncoder();
    const sigBytes = Uint8Array.from(atob(b64Signature), (ch) => ch.charCodeAt(0));
    
    // Verify against all secrets (rotation support)
    for (const secret of secrets) {
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      );
      
      const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(payloadStr));
      if (isValid) return payload;
    }
    
    return null;
  } catch {
    return null;
  }
}
