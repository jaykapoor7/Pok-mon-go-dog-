import Link from "next/link";
import { InfoPage, H2 } from "@/components/info/InfoPage";

export const metadata = {
  title: "Our mission, StrayPaw",
  description:
    "India has no reliable count of its street animals, ward by ward. StrayPaw exists to build one, and to publish it with its method attached.",
};

export default function MissionPage() {
  return (
    <InfoPage title="Our mission">
      <p className="text-[17px] leading-relaxed text-bark-900 dark:text-bark-50">
        India cannot say how many street animals it has, where they are, or
        how many have been sterilised. StrayPaw exists to answer those three
        questions for real places, one ward at a time, and to publish the
        answers with the method attached so anyone can check them.
      </p>

      <H2>The problem is measurement, not effort</H2>
      <p>
        The ABC (Dogs) Rules require every municipality to run a sterilisation
        programme. Rescues and municipal teams do the work, often for decades.
        What almost nobody has is a denominator: a count of the animals in an
        area, so a sterilisation figure can be a rate rather than a number of
        surgeries.
      </p>
      <p>
        Chennai is a fair example. Long-running ABC work by named
        organisations, widely cited coverage estimates, and no official
        ward-level figure published by the corporation. That is not a criticism
        of the people doing the work. It is a gap in the record, and the gap is
        what we are here for.
      </p>

      <H2>What we are building</H2>
      <p>
        Two things, and they depend on each other. A record of individual
        animals, built from sightings by residents, volunteers and field teams,
        which follows one animal across the years rather than resetting each
        time somebody new sees it. And a count of those animals inside
        published municipal boundaries, so a ward, a district and a state each
        have a number that came from somewhere.
      </p>

      <H2>Five rules we hold ourselves to</H2>
      <p>
        These are not values on a wall. Each one is a decision in the software
        that we could have made the easier way and did not.
      </p>
      <p>
        <b>An area with no records is not an area with no animals.</b> It is an
        area nobody has surveyed. Those are opposite findings, and a map that
        shades them the same colour tells a funder that an unvisited ward is a
        quiet one. Unsurveyed areas are grey on our maps, outside the scale
        rather than at the bottom of it.
      </p>
      <p>
        <b>A rate has to say what it is a rate of.</b> Every sterilisation
        percentage on this site is shown twice: of the animals somebody
        actually checked, and of every animal on record with the unchecked
        counted against. The first number is kinder and the second is honest,
        and printing only one of them is how coverage gets overstated.
      </p>
      <p>
        <b>&ldquo;Nobody checked&rdquo; is a real answer.</b> An animal&apos;s
        sterilisation status is sterilised, not sterilised, or unknown. A
        yes-or-no field cannot say that nobody has looked, so it quietly files
        every unexamined animal alongside the confirmed ones.
      </p>
      <p>
        <b>Nothing reaches an organisation&apos;s dashboard on its own.</b> A
        volunteer&apos;s report waits until that organisation files it. A
        community sighting has to be claimed. Friction is the point: numbers
        nobody accepted responsibility for are numbers nobody can defend.
      </p>
      <p>
        <b>Every figure names its source.</b> Boundaries carry the dataset they
        came from and its licence. Costs cite the municipal tender or the
        notified ceiling. Where a number does not exist, we say so instead of
        estimating one.
      </p>

      <H2>What we do not claim</H2>
      <p>
        Our counts are animals recorded in StrayPaw. They are not an estimated
        population, and they should never be read as one. In most of the
        country the honest figure today is zero surveyed, and we would rather
        show that than a modelled number that looks authoritative and answers a
        question nobody asked.
      </p>
      <p>
        We are also not a rescue service. When an animal needs help, the people
        who go out are the organisations already doing it. Our job is to make
        sure they can find the animal, and that what they did to it is still on
        the record in five years.
      </p>

      <H2>Where this goes</H2>
      <p>
        A ward officer should be able to open a page and see what is known
        about their ward. A corporation funding a programme should be able to
        see the same numbers the NGO sees, drawn against boundaries both of
        them recognise. A researcher should be able to download the table and
        find the arithmetic holds.
      </p>
      <p>
        None of that requires anything clever. It requires the records to be
        kept properly, in one place, by the people already doing the work, and
        published in a form somebody can argue with. That is the whole plan.
      </p>

      <p className="text-sm text-bark-500 dark:text-bark-400">
        You can read the argument in more detail on{" "}
        <Link href="/why-straypaw" className="underline underline-offset-2">
          Why StrayPaw
        </Link>
        , see what is currently known and missing on{" "}
        <Link href="/evidence" className="underline underline-offset-2">
          the evidence page
        </Link>
        , or check every figure we cite in{" "}
        <Link href="/sources" className="underline underline-offset-2">
          sources
        </Link>
        . Built in India by Jay.
      </p>
    </InfoPage>
  );
}
