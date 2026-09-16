import assert from "node:assert/strict";
import { parseINRAmount } from "../src/lib/case-actions";

assert.equal(parseINRAmount("2500"), 2500);
assert.equal(parseINRAmount("2,500.50"), 2500.5);
assert.equal(parseINRAmount("₹ 99.99"), 99.99);
assert.equal(parseINRAmount("0"), 0);
assert.equal(parseINRAmount("-1"), null);
assert.equal(parseINRAmount("12.345"), null);
assert.equal(parseINRAmount("not an amount"), null);

console.log("Case INR validation regression passed.");
