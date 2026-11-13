import { S4Page } from "@/sp4/site/kit";
import { TryDemo } from "@/sp/demo/TryDemo";

export const metadata = {
  title: "Live demo, StrayPaw",
  description: "A two-minute tour of StrayPaw's real workspaces on illustrative data: the NGO, the hospital, the laboratory, the programme and the municipal office.",
  robots: { index: false, follow: false },
};

export default function TryPage() {
  return (
    <S4Page close={false}>
      <section className="s4-wrap" style={{ padding: "96px var(--s4-gut) 120px" }}><TryDemo /></section>
    </S4Page>
  );
}
