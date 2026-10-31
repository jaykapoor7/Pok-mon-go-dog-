import type { Metadata } from "next";
import { PageHead, S3Page } from "@/sp3/site/Sections";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Questions, StrayPaw",
  description:
    "Answers on how reporting, review, organisation dashboards and access codes work on StrayPaw, and what a report does and does not promise.",
};

/* ════════════════════════════════════════════════════════════════════
   Questions.

   Written from the ones actually asked during the PAWS Chennai setup, in
   the order somebody hits them: can I use this without an account, what is
   this code, why is my number not moving, who can see what.

   Plain answers. Where the answer is "no" or "not yet", it says so.
   ════════════════════════════════════════════════════════════════════ */

type QA = { q: string; a: React.ReactNode };

const SECTIONS: { title: string; note: string; items: QA[] }[] = [
  {
    title: "Reporting an animal",
    note: "For anyone who has seen a street animal and wants it on the record.",
    items: [
      {
        q: "Do I need an account to report?",
        a: (
          <>
            No. A location is the whole thing; a photo helps the right animal
            be recognised, but a report without one still counts. Go to{" "}
            <Link href="/report">the reporting page</Link> and send it.
          </>
        ),
      },
      {
        q: "What is an account for, then?",
        a: (
          <>
            Following. With one, the animals you report stay on your{" "}
            <Link href="/following">Following page</Link> so you find out what
            happened to them. That is the only thing it changes.
          </>
        ),
      },
      {
        q: "I cannot tell whether a dog is sterilised. What do I put?",
        a: (
          <>
            &ldquo;Not sure&rdquo;. It is a real answer and it is the default.
            An ear notch or a clipped ear usually means sterilised, and a
            collar or tag from a drive usually means vaccinated, but a guess
            entered here becomes a coverage figure later, so recording the not
            knowing is worth more than filling the box.
          </>
        ),
      },
      {
        q: "Will my exact location be public?",
        a: (
          <>
            No. Locations are shown to the public at reduced precision. The
            organisation working an area sees what it needs to find the animal.
          </>
        ),
      },
      {
        q: "What happens after I send a report?",
        a: (
          <>
            It waits for a person. Either an organisation working that area
            claims it, or a moderator reviews it. Nothing appears on a
            dashboard automatically, which is why it can take a little while.
          </>
        ),
      },
    ],
  },
  {
    title: "Codes and signing in",
    note: "For anyone who was given six characters.",
    items: [
      {
        q: "What is my code?",
        a: (
          <>
            Six letters and numbers that arrive by email &mdash; either because
            you <Link href="/access">asked for one yourself</Link> to follow
            your reports, or because a team lead added you to an organisation.
            It is your sign-in. Go to{" "}
            <Link href="/join">straypaw.org/join</Link>, type it, and you are
            in. There is no password and no account to create.
          </>
        ),
      },
      {
        q: "Does it stop working after one use?",
        a: (
          <>
            No. The same code works every time, on any phone or laptop, until
            somebody turns it off. Keep it somewhere you can find it.
          </>
        ),
      },
      {
        q: "I have lost my code.",
        a: (
          <>
            Request a new one at <Link href="/access">straypaw.org/access</Link> with the same
            email if it was your own, or ask your team lead to add you again. That issues a new one and
            stops the old one working.
          </>
        ),
      },
      {
        q: "What is the difference between a staff code and a volunteer code?",
        a: (
          <>
            A staff code opens your organisation&rsquo;s dashboard: the animals
            on record, coverage figures, cases. A volunteer code does not open
            anything. It only means that what you report is credited to you and
            goes to your organisation.
          </>
        ),
      },
      {
        q: "Somebody left. How do I stop their access?",
        a: (
          <>
            Team, then Remove next to their name. Their code stops working
            immediately and they lose the dashboard even if they are signed in
            at that moment.
          </>
        ),
      },
    ],
  },
  {
    title: "Running an organisation",
    note: "For team leads and members.",
    items: [
      {
        q: "How do I add someone?",
        a: (
          <>
            Team, then their name, email and what they do. StrayPaw emails them
            a code of their own and shows it to you as well, in case the email
            does not land. Only a team lead can give somebody the dashboard;
            any member can issue a volunteer a reporting code.
          </>
        ),
      },
      {
        q: "My volunteer sent in reports but my numbers have not moved.",
        a: (
          <>
            That is deliberate. Their reports are in Incoming, waiting for you
            to say which drive they belong to. Filing them is what puts the
            animals on your register and starts them counting. Nothing lands on
            your dashboard without somebody at your organisation deciding it
            should.
          </>
        ),
      },
      {
        q: "What is a drive?",
        a: (
          <>
            A named piece of work: a ward census, a sterilisation round, a
            rabies drive. It has dates, an area, and a coverage figure of its
            own, which is what gets reported against rather than a rate across
            everything you have ever recorded.
          </>
        ),
      },
      {
        q: "Why are two sterilisation percentages shown?",
        a: (
          <>
            Because they answer different questions. The first is coverage
            across the animals whose status you actually established, which is
            the honest programme figure. The second is coverage across
            everything recorded, which is lower whenever animals were not
            checked. An unknown is never counted as a negative.
          </>
        ),
      },
      {
        q: "Can I take on a sighting the public reported?",
        a: (
          <>
            Yes. Incoming has a Community tab of sightings nobody owns.
            Claiming one files it into a drive and makes it your work.
          </>
        ),
      },
      {
        q: "Can another organisation see our records?",
        a: (
          <>
            No. Every read is scoped inside the database to the organisation
            you belong to, not by a filter a page might forget to apply.
          </>
        ),
      },
      {
        q: "We already track animals in a spreadsheet.",
        a: <>Import records brings them into the register.</>,
      },
    ],
  },
  {
    title: "The data",
    note: "What the numbers on this site are and are not.",
    items: [
      {
        q: "Where do the figures on the public pages come from?",
        a: (
          <>
            Published sources, cited on <Link href="/evidence">Evidence</Link>.
            Where a number does not exist, the page says so rather than
            estimating one.
          </>
        ),
      },
      {
        q: "Does StrayPaw identify individual dogs from photographs?",
        a: (
          <>
            No. When a new sighting might be an animal already on record, a
            person is shown the candidates and chooses, and the record says who
            made that link and how sure they were. Nothing is merged
            automatically on the basis of looking similar.
          </>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <S3Page>
      <PageHead eyebrow="FAQ" title="Questions" lede={<>The ones that actually come up. If yours is not here, <Link className="s3-link" href="/contact">ask us</Link>.</>} />
      <div className="s3-wrap s3h-faq" style={{ paddingBottom: 96 }}>
        <nav aria-label="Sections" style={{ display: "grid", gap: 6, alignContent: "start", position: "sticky", top: 96 }}>
          {SECTIONS.map((s) => <a key={s.title} href={`#${s.title.toLowerCase().replace(/[^a-z]+/g, "-")}`} style={{ color: "var(--s3-mute)", fontSize: 14.5 }}>{s.title}</a>)}
        </nav>
        <div>
          {SECTIONS.map((s) => (
            <section key={s.title} id={s.title.toLowerCase().replace(/[^a-z]+/g, "-")} style={{ scrollMarginTop: 90, marginBottom: 40 }}>
              <h2 className="s3-h3" style={{ marginBottom: 6 }}>{s.title}</h2>
              {s.items.map((i) => (
                <details key={i.q}>
                  <summary>{i.q}</summary>
                  <div className="s3-body" style={{ padding: "0 0 20px", fontSize: 15.5, maxWidth: 680 }}>{i.a}</div>
                </details>
              ))}
            </section>
          ))}
        </div>
      </div>
    </S3Page>
  );
}
