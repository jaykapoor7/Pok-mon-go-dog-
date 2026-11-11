import { S4Page } from "@/sp4/site/kit";
import { TryDemo } from "@/sp/demo/TryDemo";

export const metadata = {
  title: "Live demo, StrayPaw",
  description: "Walk through a sample Bengaluru ABC programme as a field worker, vet, coordinator, programme lead and municipal reviewer.",
  robots: { index: false, follow: false },
};

export default function TryPage() {
  return (
    <S4Page close={false}>
      <section className="s4-wrap" style={{ padding: "96px var(--s4-gut) 120px" }}><TryDemo /></section>
    </S4Page>
  );
}
