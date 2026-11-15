import { notFound } from "next/navigation";
import { readVoiceSettings, voiceTestEnabled } from "@/lib/kaju-voice/server";
import { VoiceTest } from "@/kaju/voice/VoiceTest";
import "@/kaju/voice/voice.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kaju Voice, StrayPaw", robots: { index: false, follow: false } };

export default function KajuVoicePage() {
  if (!voiceTestEnabled()) notFound();
  const settings = readVoiceSettings();
  return <main className="kv" id="main">
    <a href="/next/kaju">Back to Kaju</a>
    <p className="kv-label">Kaju Voice · Staging preview</p>
    <h1>Speak with Kaju</h1>
    <p>Speak in English, Hindi or Kannada. Kaju follows when you switch languages.</p>
    <p>Voice conversations send microphone audio to Sarvam. Use a sample conversation without personal or patient details.</p>
    <VoiceTest preview={process.env.VERCEL_ENV === "preview"} ready={process.env.SARVAM_VOICE_ENABLED === "true" && !("missing" in settings)} />
    {"missing" in settings ? <p className="kv-note">Preview configuration needed: {settings.missing.join(", ")}. No connection has been made.</p> : null}
  </main>;
}
