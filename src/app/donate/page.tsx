import Link from "next/link";
import { HeartHandshake, HandHelping, Share2, ArrowRight } from "lucide-react";
import { DocPage } from "@/sp4/site/kit";

export const metadata = {
  title: "Donate & sponsor, StrayPaw",
  description:
    "StrayPaw is free and open. Support street-dog care by donating, sponsoring a rescue, volunteering or spreading the word.",
};

// Optional: set NEXT_PUBLIC_DONATE_URL (a UPI/Razorpay/Ko-fi/etc link) to show a
// primary Donate button. Without it, the page guides people to partner NGOs.
const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL?.trim();

export default function DonatePage() {
  return (
    <DocPage title="Support StrayPaw">
      <p>
        StrayPaw is free, open and community-run, there&apos;s no paywall and no
        ads. If it&apos;s helped you or a dog near you, here are a few ways to keep
        it going and get more dogs cared for.
      </p>

      {DONATE_URL && (
        <a
          href={DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="s4-btn is-primary"
        >
          <HeartHandshake size={18} aria-hidden /> Donate to StrayPaw
        </a>
      )}

      <h2>Fund a rescue directly</h2>
      <p>
        The biggest impact is supporting the NGOs doing the on-ground work,
        clearing vet bills, sterilisation drives and emergencies. Their live
        fundraisers link straight to each rescue&apos;s own donation channel.
      </p>
      <Link
        href="/fundraisers"
        className="s4-btn is-primary"
      >
        <HeartHandshake size={18} aria-hidden /> See NGO fundraisers
      </Link>
      <Link
        href="/community/organisations"
        className="s4-link is-sm"
      >
        See partner NGOs <ArrowRight size={16} aria-hidden />
      </Link>

      <h2>Give your time</h2>
      <p>
        Not able to donate? Offering to help a dog near you, or registering your
        rescue, is just as valuable.
      </p>
      <Link
        href="/get-involved"
        className="s4-link is-sm"
      >
        <HandHelping size={16} aria-hidden /> Volunteer or register an NGO
      </Link>

      <h2>Spread the word</h2>
      <p>
        Sharing StrayPaw puts more eyes on the street, every new reporter makes
        the map more useful for the dogs and the rescues that help them.
      </p>
      <Link
        href="/community"
        className="s4-link is-sm"
      >
        <Share2 size={16} aria-hidden /> Open the map
      </Link>

      <p className="s4-small">
        Open-sourcing stray-dog care, for the people, by the people.
      </p>
    </DocPage>
  );
}
