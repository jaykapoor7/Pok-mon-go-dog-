import Link from "next/link";
import { HeartHandshake, HandHelping, Share2, ArrowRight } from "lucide-react";
import { InfoPage, H2 } from "@/components/info/InfoPage";

export const metadata = {
  title: "Support StrayPaw — Donate & sponsor",
  description:
    "StrayPaw is free and open. Support street-dog care by donating, sponsoring a rescue, volunteering or spreading the word.",
};

// Optional: set NEXT_PUBLIC_DONATE_URL (a UPI/Razorpay/Ko-fi/etc link) to show a
// primary Donate button. Without it, the page guides people to partner NGOs.
const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL?.trim();

export default function DonatePage() {
  return (
    <InfoPage title="Support StrayPaw">
      <p>
        StrayPaw is free, open and community-run — there&apos;s no paywall and no
        ads. If it&apos;s helped you or a dog near you, here are a few ways to keep
        it going and get more dogs cared for.
      </p>

      {DONATE_URL && (
        <a
          href={DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-2 w-full py-3 text-base"
        >
          <HeartHandshake className="h-5 w-5" /> Donate to StrayPaw
        </a>
      )}

      <H2>Back a rescue directly</H2>
      <p>
        The biggest impact is supporting the NGOs doing the on-ground work —
        feeding, vaccinating, sterilising and rescuing. Find verified partners and
        their outcomes on the dashboard.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 font-semibold text-paw-600 hover:underline"
      >
        See partner NGOs <ArrowRight className="h-4 w-4" />
      </Link>

      <H2>Give your time</H2>
      <p>
        Not able to donate? Offering to help a dog near you, or registering your
        rescue, is just as valuable.
      </p>
      <Link
        href="/help"
        className="inline-flex items-center gap-1.5 font-semibold text-paw-600 hover:underline"
      >
        <HandHelping className="h-4 w-4" /> Volunteer or register an NGO
      </Link>

      <H2>Spread the word</H2>
      <p>
        Sharing StrayPaw puts more eyes on the street — every new reporter makes
        the map more useful for the dogs and the rescues that help them.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 font-semibold text-paw-600 hover:underline"
      >
        <Share2 className="h-4 w-4" /> Back to the map
      </Link>

      <p className="mt-6 text-sm text-bark-400">
        Open-sourcing stray-dog care — for the people, by the people.
      </p>
    </InfoPage>
  );
}
