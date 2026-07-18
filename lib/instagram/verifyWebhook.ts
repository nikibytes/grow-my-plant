/**
 * Instagram / Meta webhook verification (the GET handshake).
 *
 * Meta calls GET /api/instagram/webhook?hub.mode=subscribe&hub.challenge=...&hub.verify_token=...
 * We must echo `hub.challenge` only when the verify token matches ours.
 */

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
