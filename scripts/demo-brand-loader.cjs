/* Demonstration builds only (next.config.mjs adds this loader when the build points at the staging database).
   The demo presents a group's proposed product, not StrayPaw: every visible "StrayPaw" and "Kaju" in the source
   becomes the demo's neutral names. Only text is touched (string literals, template text and JSX text), never
   code, so component names, routes, CSS classes, data keys and database names stay as they are: those are written
   in lower case or as identifiers. Production builds never load this. Keep the defaults in sync with
   src/lib/demo-brand.ts. */
const ts = require("typescript");

const BRAND = (process.env.NEXT_PUBLIC_DEMO_BRAND || "").trim() || "One Health Response";
const AIDE = (process.env.NEXT_PUBLIC_DEMO_ASSISTANT || "").trim() || "Assistant";
const WORD = /\b(StrayPaw|Kaju)\b|@kaju\b/g;
const swap = (s) => s.replace(WORD, (m) => (m === "Kaju" ? AIDE : m === "@kaju" ? `@${AIDE.toLowerCase()}` : BRAND));
const K = ts.SyntaxKind;
const TEXT = new Set([K.StringLiteral, K.NoSubstitutionTemplateLiteral, K.TemplateHead, K.TemplateMiddle, K.TemplateTail, K.JsxText]);

function rebrand(source, file) {
  if (!/StrayPaw|Kaju/.test(source)) return source;
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, /\.tsx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits = [];
  const visit = (n) => {
    if (TEXT.has(n.kind)) {
      const p = n.parent;
      /* Module paths are never text. */
      const path = p && (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isExternalModuleReference(p) || (ts.isCallExpression(p) && (p.expression.kind === K.ImportKeyword || (ts.isIdentifier(p.expression) && p.expression.text === "require"))));
      if (!path) {
        const start = n.getStart(sf), end = n.getEnd(), text = source.slice(start, end);
        WORD.lastIndex = 0;
        if (WORD.test(text)) edits.push([start, end, swap(text)]);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  let out = source;
  for (const [s, e, t] of edits.sort((a, b) => b[0] - a[0])) out = out.slice(0, s) + t + out.slice(e);
  return out;
}

module.exports = function demoBrandLoader(source) { return rebrand(source, this.resourcePath); };
module.exports.rebrand = rebrand;
