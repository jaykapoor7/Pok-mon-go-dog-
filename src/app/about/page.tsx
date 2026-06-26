import { InfoPage, H2 } from "@/components/info/InfoPage";

export const metadata = { title: "About — StrayPaw" };

export default function AboutPage() {
  return (
    <InfoPage title="About StrayPaw">
      <p>
        StrayPaw is a community-powered map for discovering and caring for
        the city&apos;s street dogs. Every sighting people add builds a living
        record of where dogs are, how they&apos;re doing, and what help they
        need over time.
      </p>
      <H2>Why it exists</H2>
      <p>
        India is home to tens of millions of street dogs. Feeders,
        rescuers and NGOs do incredible work, but they often lack a shared,
        real-time picture of the ground. StrayPaw turns everyday sightings into
        that picture — so feeding, vaccination, sterilisation and rescue can be
        targeted where they matter most.
      </p>
      <H2>How it works</H2>
      <p>
        Anyone can browse the map for free. Add a name to report a dog with a
        photo and location. Sightings of the same dog are grouped into a single
        profile that tracks its story, and NGOs use the dashboard to see who
        needs help.
      </p>
      <p className="text-sm text-bark-400">Built in India by Jay.</p>
    </InfoPage>
  );
}
