# StrayPaw Research Models

Five browser experiments with a public research notebook. The stand-alone app has no runtime framework, API keys, database access, external asset requests, or runtime dependencies. A static Node build writes the site to `dist/`. The simulations and interactions are TypeScript.

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run preview
```

Use Node 22.18 or later. Set `SITE_URL` to the public origin to generate canonical links, the sitemap and social metadata for a different deployment.

The public snapshot in `src/snapshot.ts` is dated. Its inputs can be reproduced against production StrayPaw with the read-only `data/snapshot.sql` queries. Review outputs and attribution before replacing any value. Re-run the model checks and verify the editorial explanation if the snapshot changes. The data records ground the scenarios, and the model notes identify the assumptions and the limits of each result.

The dedicated Vercel configuration uses the static output and clean URLs. This app can also be served by a static host that maps extensionless routes to HTML. For static hosting under a portfolio path, run `SITE_URL=https://kapoorjay.com/research-models SITE_STATIC_HTML=1 npm run build`, then copy the contents of `dist/` under `public/research-models/` in the portfolio. The portfolio and StrayPaw links are configured in `src/editorial.mjs`.
