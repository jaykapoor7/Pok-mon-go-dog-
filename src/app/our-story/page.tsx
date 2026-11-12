import Link from "next/link";
import { Block, PageHead, S4Page, TwoTone } from "@/sp4/site/kit";
import { getFieldPartners } from "@/lib/partners";

export const revalidate = 300;
export const metadata = { title: "Our Story, StrayPaw", description: "Why StrayPaw exists, what we are building and how to get involved." };
export default async function StoryPage() {
  const partners = await getFieldPartners().catch(() => []);
  return <S4Page close={false} className="s4-docpage">
    <PageHead title={<TwoTone a="Every street animal deserves a history." b="So we are building one." />}
      lede="StrayPaw builds shared information and coordination tools for street-animal care in India." />
    <Block title="Why StrayPaw exists."><p>Residents, rescuers, vets and feeders each hold part of an animal’s story. When that information stays in separate chats and registers, the next person has to start again.</p></Block>
    <Block title="How it began."><p>StrayPaw began as a community reporting tool. Its early reports exposed a wider problem: observations, case notes and care histories needed to continue across people and organisations.</p><p>The company is building towards one useful record that communities can contribute to, teams can work from and institutions can inspect.</p></Block>
    <Block title="What we’re building."><p>A shared record connects reports, cases and care to the animal they describe. Teams can see the next step and keep a history for whoever comes after them.</p><p><Link href="/platform">See the product</Link>. StrayPaw provides tools for coordination and recordkeeping, not guaranteed rescue or veterinary services.</p></Block>
    <Block title="What’s available today."><p>Community and WhatsApp reporting, NGO workspaces, animal histories and the Living Map are running today.</p><h3>Field partners</h3><ul>{partners.map(p => <li key={p.id}><Link href={`/community/organisations/${p.slug}`}>{p.name}</Link>{p.city ? ` · ${p.city}` : ""}</li>)}</ul><p>Much of the public record comes from imported historical registers. Credited data sources are listed separately. <Link href="/community/organisations">Organisation directory</Link> · <Link href="/evidence">Credited sources</Link></p></Block>
    <Block title="What’s next."><p>More field partners, more local reporting and closer alignment with municipal boundaries. These are areas of work, not claims of complete coverage.</p></Block>
    <Block title="How to get involved."><p><Link href="/community/report">Report an animal</Link>, <Link href="/sign-in?as=org">register your organisation</Link>, or <Link href="/contact">get in touch</Link>.</p><p>StrayPaw is built in India. <Link href="/data-governance">Data principles</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/licences">Art credits</Link></p></Block>
  </S4Page>;
}
