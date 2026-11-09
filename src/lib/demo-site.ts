/* The staging database serves only the demonstration (demo.straypaw.org and
   previews). A build pointed at it is a demonstration build: it labels every
   signed-in screen and offers the guided demo. Production never matches. */
export const STAGING_REF = "ucxfxiddufwqithtdtix";
export const DEMO_SITE = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").includes(STAGING_REF);

/* The public live demo, linked from straypaw.org once demo.straypaw.org is open to visitors. */
export const LIVE_DEMO_URL = "https://demo.straypaw.org/try?go=1";
export const LIVE_DEMO_PUBLIC = process.env.NEXT_PUBLIC_DEMO_PUBLIC === "1";
