import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("includes Arcila booking metadata and primary calendar content", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(layout, /Book Training \| Arcila Training/);
  assert.match(page, /Schedule your/);
  assert.match(page, /Small Group/);
  assert.match(page, /Birthday Party/);
  assert.match(page, /Team \/ Club Practice/);
  assert.match(page, /Booking calendar/);
});
