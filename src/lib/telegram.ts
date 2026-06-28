// ─────────────────────────────────────────────────────────────
// Server-only Telegram notifier. Pings the operator when something needs
// attention (new report, NGO/volunteer sign-up). No-ops silently when the
// bot isn't configured, and never throws — notifications must not break a write.
//
// Setup (Vercel → Environment Variables, server-side, NOT NEXT_PUBLIC):
//   TELEGRAM_BOT_TOKEN  — from @BotFather
//   TELEGRAM_CHAT_ID    — your chat id (message the bot, then read it from
//                         https://api.telegram.org/bot<token>/getUpdates)
// ─────────────────────────────────────────────────────────────

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://straypaw.kapoorjay.com";

export async function notifyTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return; // not configured → silent no-op

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch {
    /* never throw — alerts are best-effort */
  }
}

/** Link helper for the moderation panel. */
export const moderateUrl = `${SITE}/moderate`;
