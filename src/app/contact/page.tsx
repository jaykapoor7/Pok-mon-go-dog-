import { MarketingShell } from "@/components/marketing/MarketingShell";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata = {
  title: "Contact, StrayPaw",
  description: "Get in touch with StrayPaw, questions, partnership ideas, feedback, or content requests.",
};

export default function ContactPage() {
  return (
    <MarketingShell
      eyebrow="Contact"
      title="Get in touch."
      intro="Questions, partnership ideas, feedback, or want to remove content you can no longer delete yourself? We read every message."
    >
      <ContactForm />

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-5 dark:border-white/10 dark:bg-bark-900/40">
          <p className="text-[13px] font-semibold text-bark-900 dark:text-bark-50">For NGOs &amp; rescuers</p>
          <p className="mt-1 text-sm leading-relaxed text-bark-600 dark:text-bark-300">
            Want to run your operations on StrayPaw? See what partnership includes on the{" "}
            <a href="/partnerships" className="font-medium text-paw-600 hover:underline dark:text-paw-300">Partnerships</a> page, then request access.
          </p>
        </div>
        <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-5 dark:border-white/10 dark:bg-bark-900/40">
          <p className="text-[13px] font-semibold text-bark-900 dark:text-bark-50">Where we are</p>
          <p className="mt-1 text-sm leading-relaxed text-bark-600 dark:text-bark-300">
            Built in India. Working across the country, for the people, by the people.
          </p>
        </div>
      </div>
    </MarketingShell>
  );
}
