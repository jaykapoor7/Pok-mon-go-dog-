#  StrayPaw 

> **Every dog has a story. Start seeing them.**

A community-powered **web app** (a website, runs in any browser, deploys to a URL) where people discover, explore and upload sightings of Delhi's street dogs. Every sighting builds a living database of the city's dogs, tracking their location, health and care over time

## Apply a Supabase migration

The repository has a manual **Apply Supabase migration** workflow. Add the
Supabase Postgres URI as the repository secret `SUPABASE_DATABASE_URL` (GitHub
→ Settings → Secrets and variables → Actions), then open Actions → Apply
Supabase migration → Run workflow and choose `pilot`.

The connection string is never written to the repository or workflow logs.
