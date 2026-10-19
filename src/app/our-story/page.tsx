import Link from "next/link";
import { CoShell, CoSec } from "@/components/co3/CoShell";
import { getOperationalPartners } from "@/lib/partners";

export const revalidate = 300;
export const metadata = { title: "Our Story, StrayPaw", description: "Why StrayPaw exists, what we are building and how to get involved." };
export default async function StoryPage() {
  const partners = await getOperationalPartners().catch(() => []);
  return <CoShell seed={4} kicker="Our Story" title="Every street animal deserves a history. So we are building one."
    lede="StrayPaw builds shared information and coordination tools for street-animal care in India." close={false}>
    <CoSec title="Why StrayPaw exists."><p>Residents, rescuers, vets and feeders each hold part of an animal’s story. When that information stays in separate chats and registers, the next person has to start again.</p></CoSec>
    <CoSec title="What we’re building and why."><p>A shared record connects reports, cases and care to the animal they describe. Teams can see the next step and keep a history for whoever comes after them.</p><p><Link href="/product">See the product</Link>. StrayPaw provides tools for coordination and recordkeeping, not guaranteed rescue or veterinary services.</p></CoSec>
    <CoSec title="Genuine progress."><p>Community reporting, NGO workspaces, animal histories and the Living Map are running today.</p>{partners.map(p => <p key={p.id}><b>Field partner:</b> {p.name}{p.city ? `, ${p.city}` : ""}.</p>)}<p>Much of the public record comes from imported historical registers. A listed organisation or credited data source is not a partnership. <Link href="/community/organisations">Organisation directory</Link> · <Link href="/evidence">Credited sources</Link></p></CoSec>
    <CoSec title="What’s next."><p>More field partners, more local reporting and closer alignment with municipal boundaries. These are areas of work, not claims of complete coverage.</p></CoSec>
    <CoSec title="How to get involved."><p><Link href="/community/report">Report an animal</Link>, <Link href="/partner-apply">apply for an organisation workspace</Link>, or <Link href="/contact">get in touch</Link>.</p><p>StrayPaw is independently built in India. <Link href="/data-governance">Data principles</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/art-credits">Art credits</Link></p></CoSec>
  </CoShell>;
}
