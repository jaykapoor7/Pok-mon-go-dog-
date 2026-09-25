import { unstable_cache } from "next/cache";
import { SPATIAL_TAG } from "@/lib/spatial/server";
import { getPublicCareTimeline, getPublishedCaseStories } from "./community-case-stories";

/* The published stories take two to three seconds to assemble: every public
   case and every care event, read page by page. Uncached, that was the whole
   wait on /app, every visit. They change when an organisation edits a case,
   which already revalidates SPATIAL_TAG, so they share the tag; otherwise
   they refresh every five minutes. */
export const getPublishedCaseStoriesCached = unstable_cache(
  () => getPublishedCaseStories(),
  ["published-case-stories-v1"],
  { revalidate: 300, tags: [SPATIAL_TAG] },
);

export const getPublicCareTimelineCached = unstable_cache(
  () => getPublicCareTimeline(),
  ["public-care-timeline-v1"],
  { revalidate: 300, tags: [SPATIAL_TAG] },
);
