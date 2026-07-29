/**
 * Instagram / Meta webhook verification (the GET handshake).
 *
 * Meta calls GET /api/instagram/webhook?hub.mode=subscribe&hub.challenge=...&hub.verify_token=...
 * We must echo `hub.challenge` only when the verify token matches ours.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "@/lib/config";

export interface VerifyQuery {
  "hub.mode"?: string;
  "hub.challenge"?: string;
  "hub.verify_token"?: string;
}

export interface VerifyResult {
  ok: boolean;
  challenge?: string;
  error?: string;
}

export function verifyWebhook(query: VerifyQuery): VerifyResult {
  const mode = query["hub.mode"];
  const challenge = query["hub.challenge"];
  const token = query["hub.verify_token"];

  if (mode !== "subscribe") {
    return { ok: false, error: "invalid hub.mode" };
  }
  if (!challenge) {
    return { ok: false, error: "missing hub.challenge" };
  }
  if (token !== config.instagramVerifyToken) {
    return { ok: false, error: "verify token mismatch" };
  }
  return { ok: true, challenge };
}

/**
 * Verifies the `X-Hub-Signature-256` header Meta sends on every webhook POST.
 * The header is `sha256=<hmac of the RAW request body>` keyed by the app secret.
 *
 * IMPORTANT: we hash the raw body bytes (not the parsed JSON) and compare with a
 * constant-time check so a wrong signature is rejected before we ever parse it.
 *
 * Returns `true` when the signature is missing AND no app secret is configured
 * (dev / not-yet-wired mode) so local testing still works — but in production a
 * missing secret means we cannot trust the request, so we reject.
 */
export function verifySignature(rawBody: string | Buffer, header: string | null): boolean {
  const secret = config.instagramAppSecret;
  if (!secret) {
    // No secret configured: only safe to accept in non-production.
    return !config.isProd;
  }
  if (!header) return false;

  const prefix = "sha256=";
  if (!header.startsWith(prefix)) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = header.slice(prefix.length);

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
