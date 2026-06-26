import { InfoPage, H2 } from "@/components/info/InfoPage";

export const metadata = { title: "Community Guidelines — StrayPaw" };

export default function GuidelinesPage() {
  return (
    <InfoPage title="Community Guidelines">
      <p>
        StrayPaw works because of kind, careful contributors. A few simple
        guidelines keep the map useful and humane.
      </p>
      <H2>Do</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Post clear photos of street dogs and their location.</li>
        <li>Add honest notes — health, temperament, feeding routine.</li>
        <li>Flag dogs that genuinely need help so NGOs can act.</li>
        <li>Be gentle and patient with the dogs you photograph.</li>
      </ul>
      <H2>Don&apos;t</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Upload photos of people without consent.</li>
        <li>Pin exact private homes or share personal addresses.</li>
        <li>Post distressing imagery beyond what&apos;s needed to get help.</li>
        <li>Spam, troll, or misrepresent a dog&apos;s situation.</li>
      </ul>
      <p>
        Content that breaks these guidelines may be removed. Use Report Content
        to flag anything that needs a look.
      </p>
    </InfoPage>
  );
}
