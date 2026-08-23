import { InfoPage, H2 } from "@/components/info/InfoPage";
import { EmailDisplay } from "@/components/contact/EmailDisplay";

export const metadata = { title: "Contact, StrayPaw" };

export default function ContactPage() {
  return (
    <InfoPage title="Contact">
      <p>
        Questions, partnership ideas, or want to remove content you can no
        longer delete yourself? We&apos;d love to hear from you.
      </p>
      <H2>Get in touch</H2>
      <p className="text-sm text-bark-500">Email us at:</p>
      <EmailDisplay email="jaykapoor7@outlook.com" />
      <H2>For NGOs &amp; rescuers</H2>
      <p>
        If your organisation would like to be listed as a partner or use the
        dashboard for ground operations, mention &ldquo;NGO&rdquo; in your
        message and we&apos;ll get you set up.
      </p>
      <p className="text-sm text-bark-400">Built in India by Jay.</p>
    </InfoPage>
  );
}
