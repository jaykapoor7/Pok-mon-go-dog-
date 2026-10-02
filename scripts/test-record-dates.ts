import assert from "node:assert/strict";
import { formatDate } from "../src/lib/utils";

const originalTimezone = process.env.TZ;
for (const timezone of ["UTC", "America/Los_Angeles", "America/New_York", "Asia/Kolkata"]) {
  process.env.TZ = timezone;
  assert.equal(formatDate("2026-10-01"), "1 Oct 2026", timezone);
  assert.equal(formatDate("2026-10-01T00:00:00+00:00"), "1 Oct 2026", timezone);
  assert.equal(formatDate("2024-02-29"), "29 Feb 2024", timezone);
}
if (originalTimezone === undefined) delete process.env.TZ;
else process.env.TZ = originalTimezone;
console.log("Recorded calendar dates remain correct across browser time zones.");
