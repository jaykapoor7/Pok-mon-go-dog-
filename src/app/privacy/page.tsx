import { InfoPage, H2 } from "@/components/info/InfoPage";

export const metadata = { title: "Privacy Policy — StrayPaw" };

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy" updated="June 2026">
      <p>
        This policy explains what StrayPaw collects and how it is used.
        It is written in plain language and kept deliberately minimal.
      </p>
      <H2>What we collect</H2>
      <p>
        When you report a sighting we store the photo you upload, the location
        you attach, any tags or notes you add, and the display name you choose.
        We do not require an email or password, and we do not collect precise
        device identifiers for advertising.
      </p>
      <H2>What stays on your device</H2>
      <p>
        Your display name and the secret token that lets you delete your own
        sightings are stored only in your browser&apos;s local storage. Clearing
        your browser data removes them.
      </p>
      <H2>Location</H2>
      <p>
        Location is only read when you tap &ldquo;use my current location&rdquo;
        while reporting. Reported coordinates are shown publicly on the map, so
        please avoid pinning private residences.
      </p>
      <H2>Your choices</H2>
      <p>
        You can delete any sighting you created from the device that created it.
        To request removal of content you can no longer delete, use the Contact
        or Report Content pages.
      </p>
    </InfoPage>
  );
}
