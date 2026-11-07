import { PageHead, S4Page, TwoTone } from "@/sp4/site/kit";
import { Workbench } from "@/sp4/research/Workbench";
import { workbench } from "@/sp4/research/workbench";
import "@/sp4/home/home4.css";
import "@/sp4/research/research.css";
import "@/sp4/research/workbench.css";

export const revalidate = 3600;
export const metadata = { title: "Research workbench · StrayPaw", description: "Monthly series of recorded interventions and requests for help from StrayPaw's public records, with filters, method notes and aggregate downloads." };

export default async function WorkbenchPage() {
  const data = await workbench();
  return (
    <S4Page close={undefined} className="rs-sub">
      <PageHead title={<TwoTone a="Research" b="workbench" />} lede="Monthly series from the public record, by intervention, city and outcome. Filter, chart and download the aggregates." />
      <section className="s4-wrap" style={{ paddingTop: 32, paddingBottom: 96 }}><Workbench data={data} /></section>
    </S4Page>
  );
}
