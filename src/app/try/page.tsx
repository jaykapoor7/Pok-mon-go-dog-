import { S4Page } from "@/sp4/site/kit";
import { TryDemo } from "@/sp/demo/TryDemo";
import { DEMO_SITE } from "@/lib/demo-site";

export const metadata = {
  title: "One Health demo, StrayPaw",
  description: "One fictional dog bite followed through StrayPaw's real workspaces: the citizen, the hospital, the animal-health team, Kaju, the municipality and the One Health programme.",
  robots: { index: false, follow: false },
};

export default function TryPage() {
  /* On the demonstration site the demo is the whole page: no marketing navigation or footer. */
  if (DEMO_SITE) return <TryDemo />;
  return (
    <S4Page close={false}>
      <section className="s4-wrap" style={{ padding: "96px var(--s4-gut) 120px" }}><TryDemo /></section>
    </S4Page>
  );
}
