/* The demo's rename touches visible text only: never imports, components, routes, classes or regexes. */
const assert = require("node:assert/strict");
const { rebrand } = require("./demo-brand-loader.cjs");
const src = [
  'import { Kaju, KajuFace } from "@/kaju/Kaju";',
  'const a = "Ask Kaju", t = `Kaju for ${x}: StrayPaw`, p = "/api/oh/kaju", c = "kaju-x", re = /@kaju/i;',
  'export function X() { return <div aria-label="StrayPaw home" className="kaju-x"><Kaju state="sitting" /><KajuFace />Kaju prepared it. StrayPaw\'s way. Ask @kaju.</div>; }',
].join("\n");
const out = rebrand(src, "x.tsx");
assert.ok(out.includes('import { Kaju, KajuFace } from "@/kaju/Kaju";'), "imports untouched");
assert.ok(out.includes('<Kaju state="sitting" /><KajuFace />'), "components untouched");
assert.ok(out.includes('"/api/oh/kaju"') && out.includes('"kaju-x"') && out.includes("/@kaju/i"), "routes, classes and regexes untouched");
assert.ok(out.includes('"Ask Assistant"') && out.includes("`Assistant for ${x}: One Health Response`"), "strings renamed");
assert.ok(out.includes('aria-label="One Health Response home"'), "labels renamed");
assert.ok(out.includes("Assistant prepared it. One Health Response's way. Ask @assistant."), "JSX text renamed");
assert.equal(rebrand("const n = 1;", "y.ts"), "const n = 1;");
console.log("demo brand: 6 checks passed");
