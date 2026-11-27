import assert from "node:assert/strict";
import { test } from "node:test";
import { webhookSkipReason } from "./webhook-filter.ts";

test("webhookSkipReason: test deliveries and other environments are skipped", () => {
  assert.equal(webhookSkipReason({}, "true", undefined), "test");
  assert.equal(
    webhookSkipReason({ environment: "live" }, "TRUE", "live"),
    "test",
  );
  assert.equal(
    webhookSkipReason({ environment: "sandbox" }, null, "live"),
    "wrong_environment",
  );
  assert.equal(
    webhookSkipReason({ environment: "sandbox" }, null, "sandbox"),
    null,
  );
  assert.equal(
    webhookSkipReason({ environment: "live" }, null, undefined),
    null,
  );
  // No environment in the body (older payloads): applied as before.
  assert.equal(webhookSkipReason({}, null, "live"), null);
  assert.equal(webhookSkipReason({}, "false", undefined), null);
});
