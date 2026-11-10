import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve("dist");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".xml": "application/xml", ".txt": "text/plain" };
const port = Number(process.env.PORT || 4173);
createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const file = resolve(root, "." + (path === "/" ? "/index.html" : path));
    if (!file.startsWith(root + sep)) throw new Error("Invalid path");
    const resource = extname(file) ? file : file.replace(/\/$/, "") + ".html";
    const body = await readFile(resource);
    res.writeHead(200, { "Content-Type": types[extname(resource)] || "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404, { "Content-Type": types[".html"] }).end(await readFile(resolve(root, "404.html")));
  }
}).listen(port, "127.0.0.1", () => console.log("Preview at http://127.0.0.1:" + port));
