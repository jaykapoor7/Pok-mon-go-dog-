import { InfoPage, H2 } from "@/components/info/InfoPage";

export const metadata = { title: "Safety — StrayPaw" };

export default function SafetyPage() {
  return (
    <InfoPage title="Safety">
      <p>
        Helping street dogs is wonderful — please stay safe while you do it,
        for your sake and theirs.
      </p>
      <H2>Approaching dogs</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Move slowly and let the dog approach you first.</li>
        <li>Never corner, chase, or wake a sleeping dog suddenly.</li>
        <li>Be extra cautious around mothers with puppies.</li>
        <li>Photograph from a comfortable distance — zoom rather than crowd.</li>
      </ul>
      <H2>Injured or aggressive dogs</H2>
      <p>
        Do not attempt to handle a badly injured or frightened dog yourself.
        Mark it as &ldquo;Needs Help&rdquo; on the map and contact a trained
        rescue or an NGO. If you are bitten or scratched, wash the wound and
        seek medical advice about anti-rabies care promptly.
      </p>
      <H2>Personal safety</H2>
      <p>
        Be aware of traffic and your surroundings while reporting, especially at
        night, and avoid sharing your own precise home location.
      </p>
    </InfoPage>
  );
}
