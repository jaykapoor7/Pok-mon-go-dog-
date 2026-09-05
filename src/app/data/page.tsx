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
        <p className="ds-lede">
          Street-animal counts by area, collected by organisations doing the
          fieldwork. Every row names who collected it, over what area, by what
          method, and between which dates, so a figure can be traced back to
          the survey it came from.
        </p>
      </header>

      <DatasetClient />

      <section className="ds-method">
        <h2>How to read this</h2>
        <dl>
          <div>
            <dt>Counted, not estimated</dt>
            <dd>
              Every animal in this table was recorded by somebody who saw it.
              Nothing here is modelled up from a sample or extrapolated from a
              population estimate.
            </dd>
          </div>
          <div>
            <dt>Unknowns are reported, not absorbed</dt>
            <dd>
              &ldquo;Of checked&rdquo; is the share of animals whose status was
              actually established. Animals recorded without a status sit in
              the Unknown column and are excluded from that percentage, rather
              than being counted as unsterilised or unvaccinated. A figure that
              quietly treats unknowns as negatives understates coverage, and is
              the most common way this kind of number goes wrong.
            </dd>
          </div>
          <div>
            <dt>Nothing publishes itself</dt>
            <dd>
              A survey appears here only once an organisation has filed its
              fieldwork against a named drive. Sightings the public sends in
              are not included until somebody at an organisation has reviewed
              and claimed them.
            </dd>
          </div>
          <div>
            <dt>Areas are as specific as the record</dt>
            <dd>
              Where an organisation recorded a ward, the row is that ward.
              Where it recorded only a city, that is what appears. StrayPaw
              does not infer a boundary that was not collected.
            </dd>
          </div>
          <div>
            <dt>No personal data</dt>
            <dd>
              This table carries no reporter names, no contact details and no
              exact coordinates. It describes areas and animals, not people.
            </dd>
          </div>
          <div>
            <dt>Citing it</dt>
            <dd>
              Cite the row, not the total: the organisation, the area, the
              method and the dates. A national figure assembled from surveys
              that used different methods in different years is a summary, not
              a measurement, and this page will not pretend otherwise.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
