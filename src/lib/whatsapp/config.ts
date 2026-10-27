/** Identifiers are public configuration. Secrets have no defaults. */
export const META = {
  appId: "1872092997485005",
  phoneNumberId: "1388373327695772",
  wabaId: "1410300414599459",
  testNumber: "+1 555 145 8316",
} as const;

export function whatsappConfig() {
  return {
    appId: process.env.WHATSAPP_APP_ID || META.appId,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || META.phoneNumberId,
    wabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || META.wabaId,
    version: process.env.WHATSAPP_GRAPH_VERSION || "v25.0",
    appSecret: process.env.WHATSAPP_APP_SECRET,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  };
}

/** Prevent a preview carrying inherited production credentials from writing. */
export function assertCareosEnvironment() {
  if (process.env.CAREOS_ENABLED !== "true") throw new Error("careos_disabled");
  const target = process.env.CAREOS_SUPABASE_PROJECT_REF;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!target || !url || new URL(url).hostname !== `${target}.supabase.co`) throw new Error("careos_database_mismatch");
  const prod = target === "toujthlzjmhmoyykmayx";
  if (prod && (process.env.VERCEL_ENV !== "production" || process.env.CAREOS_ALLOW_PRODUCTION !== "true")) {
    throw new Error("careos_production_guard");
  }
  if (process.env.VERCEL_ENV === "preview" && prod) throw new Error("careos_preview_guard");
}
