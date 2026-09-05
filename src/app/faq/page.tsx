import type { Metadata } from "next";
import { BackLink } from "@/components/app/BackLink";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Questions",
  description:
    "How reporting, organisation dashboards and access codes work on StrayPaw.",
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
            No. A photo and a location is the whole thing. Go to{" "}
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
            Six letters and numbers, issued to you by name and email by
            whoever added you. It is your sign-in. Go to{" "}
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
            Ask your team lead to add you again. That issues a new one and
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
            Published sources, cited on <Link href="/sources">Sources</Link>.
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
    <div className="faq">
      <BackLink label="Back" />
      <header>
        <h1>Questions</h1>
        <p>
          The ones that actually come up. If yours is not here,{" "}
          <Link href="/contact">ask us</Link>.
        </p>
      </header>

      {SECTIONS.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          <p className="faq-note">{s.note}</p>
          <dl>
            {s.items.map((i) => (
              <div key={i.q}>
                <dt>{i.q}</dt>
                <dd>{i.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
