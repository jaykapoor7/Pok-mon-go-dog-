import { InfoPage, H2 } from "@/components/info/InfoPage";
import { Mail } from "lucide-react";

export const metadata = { title: "Contact — StrayPaw Delhi" };

export default function ContactPage() {
  return (
    <InfoPage title="Contact">
      <p>
        Questions, partnership ideas, or want to remove content you can no
        longer delete yourself? We&apos;d love to hear from you.
      </p>
      <H2>Get in touch</H2>
      <a
        href="mailto:hello@straypaw.delhi"
        className="inline-flex items-center gap-2 rounded-2xl bg-paw-500 px-5 py-3 font-semibold text-white shadow-warm hover:bg-paw-600"
      >
        <Mail className="h-4 w-4" /> hello@straypaw.delhi
      </a>
      <H2>For NGOs &amp; rescuers</H2>
      <p>
        If your organisation would like to be listed as a partner or use the
        dashboard for ground operations, mention &ldquo;NGO&rdquo; in your
        message and we&apos;ll get you set up.
      </p>
      <p className="text-sm text-bark-400">Built in Delhi by Jay.</p>
    </InfoPage>
  );
}
