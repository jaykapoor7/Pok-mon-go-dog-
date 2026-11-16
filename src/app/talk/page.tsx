import { notFound } from "next/navigation";
import { Phone } from "lucide-react";
import { PageHead, S4Page } from "@/sp4/site/kit";
import { publicVoiceSettings } from "@/lib/kaju-voice/server";
import { publicVoiceMode } from "@/lib/kaju-voice/public";
import { PublicVoice } from "@/kaju/voice/PublicVoice";
import "@/kaju/voice/voice.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Talk to Kaju, StrayPaw", description: "Talk with Kaju, StrayPaw's assistant, in English, Hindi or Kannada.", robots: { index: false, follow: false } };

/* Talk to Kaju: StrayPaw's public voice. Two ways in, kept honestly apart:
   talking now in the browser, and calling a phone number, which shows only
   once a real number is configured (NEXT_PUBLIC_KAJU_VOICE_PHONE). What Kaju
   can do is stated plainly: today it explains StrayPaw; reporting a bite and
   finding a hospital wait for clinical review and verified facility data. */
export default function TalkPage() {
  const mode = publicVoiceMode();
  if (mode === "off") notFound();
  const ready = !("missing" in publicVoiceSettings()) && !!process.env.TURNSTILE_SECRET_KEY?.trim();
  const phone = process.env.NEXT_PUBLIC_KAJU_VOICE_PHONE?.trim();
  const dial = phone && /^\+?[0-9 ]{8,16}$/.test(phone) ? phone : null;
  return (
    <S4Page close={false}>
      <PageHead back eyebrow="Kaju" title="Talk to Kaju" lede="StrayPaw's assistant, in English, Hindi or Kannada." />
      <div className="s4-wrap kvt">
        {dial ? <nav className="kvt-ways" aria-label="Ways to reach Kaju">
          <span className="kvt-way is-here">Talk now, here</span>
          <a className="kvt-way" href={`tel:${dial.replace(/ /g, "")}`}><Phone size={16} aria-hidden />Call Kaju <span translate="no">{dial}</span></a>
        </nav> : null}
        <PublicVoice ready={ready} mode={mode} />
        <section className="kvt-scope" aria-labelledby="kvt-scope-title">
          <h2 id="kvt-scope-title">What Kaju can do today</h2>
          <ul>
            <li>Tell you what StrayPaw is and how organisations use it.</li>
            <li>Answer in English, Hindi or Kannada, and switch when you do.</li>
          </ul>
          <h2>Not yet</h2>
          <ul>
            <li>Give medical advice, report a bite, or find a hospital or vaccine.</li>
            <li>Contact anyone for you, or see anyone&rsquo;s records.</li>
          </ul>
          <p className="kvt-urgent"><a href="tel:112">If someone is badly hurt, call 112.</a></p>
        </section>
      </div>
    </S4Page>
  );
}
