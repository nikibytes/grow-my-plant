/**
 * Verifies the HMAC verification of verifySignature when a secret is set
 * (the real production configuration): a missing/bad signature is rejected,
 * a correctly-signed payload is accepted. With the secret configured, this
 * behaviour is identical in dev and prod (only the no-secret fallback differs
 * between environments).
 */
process.env.INSTAGRAM_APP_SECRET = "prod-secret";

import { verifySignature } from "@/lib/instagram/verifyWebhook";
import { config } from "@/lib/config";
import { createHmac } from "node:crypto";

(config as { instagramAppSecret: string }).instagramAppSecret = "prod-secret";

let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) failures++;
}

check("rejects missing signature", verifySignature("{}", null) === false);
check("rejects bad signature", verifySignature("{}", "sha256=deadbeef") === false);
check("accepts valid signature", (() => {
  const payload = "{}";
  const sig = "sha256=" + createHmac("sha256", "prod-secret").update(payload).digest("hex");
  return verifySignature(payload, sig) === true;
})() === true);

console.log(failures === 0 ? "\nSIGNATURE CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
