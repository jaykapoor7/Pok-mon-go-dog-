import { notFound } from "next/navigation";
import { readVoiceSettings } from "@/lib/kaju-voice/server";
import { voiceMode } from "@/lib/kaju-voice/deployment";
import { WorkspaceVoice } from "@/kaju/voice/WorkspaceVoice";
import "@/kaju/voice/voice.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kaju Voice, StrayPaw", robots: { index: false, follow: false } };

const LABEL = { production: "Kaju Voice", preview: "Kaju Voice · Staging preview", local: "Kaju Voice · Local test" } as const;

export default function KajuVoicePage() {
  const mode = voiceMode();
  if (!mode) notFound();
  const settings = readVoiceSettings();
  const ready = !("missing" in settings);
  // A plain link: leaving needs a full navigation, so the next page does not
  // inherit this document's microphone permission.
  return <main className="kv" id="main">
    <div className="kv-top"><a href="/kaju">Back to Kaju</a><p className="kv-label">{LABEL[mode]}</p></div>
    <h1>Talk to Kaju</h1>
    <p className="kv-lede">Speak in English, Hindi or Kannada. Kaju follows when you switch. Do not share personal or patient details.</p>
    <WorkspaceVoice mode={mode} ready={ready} />
    {/* Setup detail is for the preview and next dev only, never the live site. */}
    {mode !== "production" && "missing" in settings ? <p className="kv-note">Configuration needed: {settings.missing.join(", ")}. No connection has been made.</p> : null}
  </main>;
}
