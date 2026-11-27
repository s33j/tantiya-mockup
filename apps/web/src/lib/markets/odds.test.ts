// Run with: pnpm --filter @tantiya/web test
import assert from "node:assert/strict";
import { test } from "node:test";
import { decimalOdds, impliedChance, sideOf, toWin } from "./odds.ts";

// Same cases as supabase/tests/betting.test.sql, so the two stay in step.

test("implied chance includes the margin", () => {
  assert.equal(impliedChance(-150), 0.6);
  assert.equal(Math.round(impliedChance(130) * 10000) / 10000, 0.4348);
  assert.ok(impliedChance(-150) + impliedChance(130) > 1);
});

test("decimal odds", () => {
  assert.equal(decimalOdds(-150).toFixed(2), "1.67");
  assert.equal(decimalOdds(130).toFixed(2), "2.30");
  assert.equal(decimalOdds(-100), 2);
});

test("to win matches private.to_win_minor", () => {
  assert.equal(toWin(300, -150), 200);
  assert.equal(toWin(100, 130), 130);
  assert.equal(toWin(101, -150), 67);
  assert.equal(toWin(1000, -150), 666);
});

test("Llamado and Dehado", () => {
  assert.equal(sideOf(-150, 130), "favourite");
  assert.equal(sideOf(130, -150), "underdog");
  assert.equal(sideOf(-110, -110), null);
});
