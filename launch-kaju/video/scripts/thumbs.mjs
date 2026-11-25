/* npm run thumbs [<slug>…]   →  out/thumb-<slug>-16x9.png (1920x1080) and out/thumb-<slug>-4x5.png (1080x1350)
   for every edit that has a `thumb`. */
import { renderStill, selectComposition, getCompositions } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { OUT, browser, idOf, makeBundle, prepare } from "./common.mjs";

const slugs = process.argv.slice(2).filter((a) => !a.startsWith("--"));
prepare();
fs.mkdirSync(OUT, { recursive: true });
const serveUrl = await makeBundle();
const comps = (await getCompositions(serveUrl, { ...browser })).filter((c) => c.id.startsWith("Thumb-") && (!slugs.length || slugs.some((s) => c.id.startsWith(`Thumb-${idOf(s)}-`))));
if (!comps.length) console.warn("No thumbnails: add a `thumb` to an edit.");
for (const c of comps) {
  const composition = await selectComposition({ serveUrl, id: c.id, ...browser });
  const output = path.join(OUT, `thumb-${c.defaultProps.edit.slug}-${c.id.split("-").pop()}.png`);
  await renderStill({ composition, serveUrl, output, imageFormat: "png", overwrite: true, ...browser });
  console.log(`${path.relative(process.cwd(), output)}  ${composition.width}x${composition.height}`);
}
