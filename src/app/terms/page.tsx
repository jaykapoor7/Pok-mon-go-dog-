import { InfoPage, H2 } from "@/components/info/InfoPage";

export const metadata = { title: "Terms — StrayPaw" };

export default function TermsPage() {
  return (
    <InfoPage title="Terms of Use" updated="June 2026">
      <p>
        By using StrayPaw you agree to these terms. The service is
        provided as-is to support community care of street dogs.
      </p>
      <H2>Acceptable use</H2>
      <p>
        Only upload photos you have the right to share, and that genuinely
        depict street dogs and their surroundings. Do not upload content that is
        abusive, misleading, or that exposes private information about people.
      </p>
      <H2>Your content</H2>
      <p>
        You keep ownership of what you upload. By posting, you grant StrayPaw a
        licence to display it within the app so the community can find and help
        the dog. We may remove content that breaches these terms or our
        Community Guidelines.
      </p>
      <H2>No warranty</H2>
      <p>
        Sightings are community-contributed and may be inaccurate. StrayPaw is
        not responsible for actions taken based on the information shown. In an
        emergency involving an injured animal, contact a local rescue or NGO
        directly.
      </p>
    </InfoPage>
  );
}
