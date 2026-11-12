import { DocPage } from "@/sp4/site/kit";

export const metadata = { title: "Safety, StrayPaw", description: "Staying safe around street animals, and when to call a local organisation or helpline instead of approaching." };

export default function SafetyPage() {
  return (
    <DocPage title="Safety" eyebrow="Staying safe">
      <p>
        Helping street animals is wonderful, please stay safe while you do it,
        for your sake and theirs.
      </p>
      <h2>Approaching dogs</h2>
      <ul>
        <li>Move slowly and let the dog approach you first.</li>
        <li>Never corner, chase, or wake a sleeping dog suddenly.</li>
        <li>Be extra cautious around mothers with puppies.</li>
        <li>Photograph from a comfortable distance, zoom rather than crowd.</li>
      </ul>
      <h2>Injured or aggressive dogs</h2>
      <p>
        Do not attempt to handle a badly injured or frightened dog yourself.
        Mark it as &ldquo;Needs Help&rdquo; on the map and contact a trained
        rescue or an NGO. If you are bitten or scratched, wash the wound and
        seek medical advice about anti-rabies care promptly.
      </p>
      <h2>Personal safety</h2>
      <p>
        Be aware of traffic and your surroundings while reporting, especially at
        night, and avoid sharing your own precise home location.
      </p>
    </DocPage>
  );
}
