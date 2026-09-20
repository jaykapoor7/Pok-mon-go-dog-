import type { Metadata } from "next";
import { BackLink } from "@/components/app/BackLink";
import { DatasetClient } from "@/components/data/DatasetClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Published data, StrayPaw",
  description:
    "Street-animal counts by area in India: animals recorded, sterilisation and rabies coverage, the method used, and who collected it. Downloadable, and traceable to the survey it came from.",
};

/* The dataset, for anyone who wants to check it rather than be told it. */
export default function DataPage() {
  return (
    <div className="ds">
      <BackLink label="Back to the evidence" to="/evidence" />
      <header>
        <h1>Published data</h1>
        <p className="ds-lede">Field records by area, with source, method and collection date.</p>
      </header>

      <DatasetClient />

      <section className="ds-method" aria-labelledby="data-notes-heading">
        <h2 id="data-notes-heading">Notes</h2>
        <dl>
          <div>
            <dt>What is included</dt>
            <dd>Published field records only. Community reports appear after an organisation reviews them.</dd>
          </div>
          <div>
            <dt>Unknown values</dt>
            <dd>Unknown is kept separate from a negative status.</dd>
          </div>
          <div>
            <dt>Privacy</dt>
            <dd>No reporter details or exact public coordinates are included.</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
