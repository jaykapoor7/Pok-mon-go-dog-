import Link from "next/link";
import { Suspense } from "react";
import { PageHead, S4Page, TwoTone } from "@/sp4/site/kit";
import { AccessRequest } from "@/sp4/research/AccessRequest";
import "@/sp4/home/home4.css";
import "@/sp4/research/research.css";

export const metadata = { title: "Request data access · StrayPaw Research", description: "Request de-identified partner data or propose a research collaboration with StrayPaw." };

export default function AccessPage() {
  return (
    <S4Page close={undefined} className="rs-sub">
      <PageHead eyebrow={<Link href="/research">StrayPaw Research</Link>} title={<TwoTone a="Request" b="data access" />}
        lede="Restricted data is released only as de-identified extracts, with the data-owning organisation's written approval and a data-sharing agreement, and with ethics approval where people are involved. Sending this form grants nothing; it starts a review." />
      <section className="s4-sec"><div className="s4-wrap rs-form-wrap">
        <Suspense fallback={null}><AccessRequest /></Suspense>
        <aside className="rs-note">
          <b>What happens next</b>
          <ol><li>We confirm the request and the data owner.</li><li>The owner decides whether to share, and on what terms.</li><li>An agreement fixes scope, retention and publication rules.</li><li>Only then is an extract prepared. Exact locations, reporter details and photographs of people are never released.</li></ol>
        </aside>
      </div></section>
    </S4Page>
  );
}
