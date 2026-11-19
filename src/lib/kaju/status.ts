import "server-only";
import { inferenceConfig } from "@/lib/ai/inference";

/* What Kaju can use on this deployment, as booleans and plain labels only. It reads which settings are present, never
   their values, and reports nothing an owner would not show on a status page. "live" works now; "setup" needs the
   owner (docs/rebuild/OWNER_ACTIONS.md); "you" needs the person to connect their own account; "none" is not built. */

export type CapState = "live" | "setup" | "you" | "none" | "unknown";
export type CapStatus = { id: string; name: string; state: CapState; label: string; detail: string };

const has = (env: Record<string, string | undefined>, ...keys: string[]) => keys.every((k) => !!env[k]?.trim());

/** Paid model planning and free-form answers: the inference gate is open and a credential is present. */
export function modelReady(env: Record<string, string | undefined> = process.env) {
  if (!inferenceConfig(env).allowed) return false;
  return has(env, "ANTHROPIC_API_KEY") || has(env, "AI_GATEWAY_API_KEY") || env.STRAYPAW_AI_ALLOW_OIDC === "true";
}

/** Gmail, Outlook or Zoho connections are registered by the owner, so a person can connect an account that sends. */
export const mailAppsReady = (env: Record<string, string | undefined> = process.env) => ["GOOGLE", "MICROSOFT", "ZOHO"].some((p) => has(env, `${p}_CLIENT_ID`, `${p}_CLIENT_SECRET`, "CONNECTIONS_ENC_KEY"));

/** `mailAccount`: whether this person has an email account connected with permission to send (null: not checked). */
export function kajuStatus(env: Record<string, string | undefined> = process.env, mailAccount: boolean | null = null): CapStatus[] {
  const model = modelReady(env);
  const mailApps = mailAppsReady(env);
  return [
    { id: "records", name: "Your organisation's records", state: "live", label: "Live", detail: "Reads only what you can open yourself." },
    { id: "missions", name: "Work in several steps: tasks and channels", state: "live", label: "Live", detail: "Steps run in the database as you, and keep going when this page is closed." },
    { id: "notices", name: "In-app notifications", state: "live", label: "Live", detail: "Approvals and finished work reach the bell." },
    model && (env.STRAYPAW_AI_ROLLOUT?.trim() || "owner") === "owner"
      ? { id: "model", name: "Planning from your own words", state: "setup", label: "Owner testing only", detail: "While the owner checks it, only the owner's account uses the model. Everyone else gets answers and plans from Kaju's fixed rules." }
      : model
      ? { id: "model", name: "Planning from your own words", state: "live", label: "Live for approved accounts", detail: "For people and organisations the owner approved, a model turns a request into a plan you review. Nothing starts until you press Start." }
      : { id: "model", name: "Planning from your own words", state: "setup", label: "Needs setup by the owner", detail: "Until a model is connected, Kaju plans from its fixed jobs and answers by rules." },
    !mailApps
      ? { id: "mission_email", name: "Email from Kaju", state: "setup", label: "Needs setup by the owner", detail: "Kaju prepares the email and it waits. Sending needs Gmail, Outlook or Zoho connections, which the owner registers." }
      : mailAccount === true
        ? { id: "mission_email", name: "Email from Kaju", state: "live", label: "Live", detail: "Approved emails are sent through your connected account at the next delivery run." }
        : mailAccount === false
          ? { id: "mission_email", name: "Email from Kaju", state: "you", label: "Connect your email", detail: "Connect Gmail, Outlook or Zoho in Settings so approved emails can be sent as you." }
          : { id: "mission_email", name: "Email from Kaju", state: "unknown", label: "Not checked", detail: "Whether your email account is connected could not be checked just now." },
    has(env, "RESEND_API_KEY", "EMAIL_FROM")
      ? { id: "email_notices", name: "Email notifications", state: "live", label: "Live", detail: "People who turned email on receive their notifications by email." }
      : { id: "email_notices", name: "Email notifications", state: "setup", label: "Needs setup by the owner", detail: "Notifications stay in the app until a sending domain is verified." },
    has(env, "NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT")
      ? { id: "push", name: "Phone and browser alerts", state: "live", label: "Live", detail: "People who turned alerts on get them on their device." }
      : { id: "push", name: "Phone and browser alerts", state: "setup", label: "Needs setup by the owner", detail: "Alerts stay in the app until push keys are set." },
    { id: "sms", name: "Text messages from Kaju", state: "none", label: "Not connected", detail: "Kaju can prepare a text message; it does not send SMS yet." },
    { id: "whatsapp", name: "WhatsApp", state: "none", label: "Not connected", detail: "Needs a verified WhatsApp Business account. Until then nothing is sent on WhatsApp." },
  ];
}
