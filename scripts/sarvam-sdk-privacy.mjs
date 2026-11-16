// Pinned upstream SDK logs signed URLs and transcripts. Remove its console
// calls at install/build time, without changing global console or transport.
import { readFile, writeFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const entry = require.resolve("sarvam-conv-ai-sdk/browser");
const root = dirname(entry);
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
if (pkg.version !== "0.0.42") throw Error("Review SDK logging before using a different Sarvam SDK version.");
const marker = "// StrayPaw: SDK console calls removed for session privacy.\n";
async function scrub(dir) {
  for (const file of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, file.name);
    if (file.isDirectory()) { await scrub(path); continue; }
    if (!file.name.endsWith(".js")) continue;
    const source = await readFile(path, "utf8");
    if (source.startsWith(marker)) continue;
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
    const result = ts.transform(ast, [(context) => {
      const visit = (node) => {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
          && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "console") return ts.factory.createVoidZero();
        return ts.visitEachChild(node, visit, context);
      };
      return (node) => ts.visitNode(node, visit);
    }]);
    await writeFile(path, marker + ts.createPrinter().printFile(result.transformed[0]));
    result.dispose();
  }
}
await scrub(root);
console.log("Sarvam SDK privacy check complete; no session data displayed.");
