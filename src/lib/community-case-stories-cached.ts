import { unstable_cache } from "next/cache";
import { getPublicCareTimeline, getPublishedCaseStories } from "./community-case-stories";

/* The published stories take two to three seconds to assemble: every public
   case and every care event, read page by page. Uncached, that was the whole
   wait on /app, every visit. They change when an organisation edits a case,
   which already revalidates SPATIAL_TAG, so they share the tag; otherwise
   they refresh every five minutes. */
export const getPublishedCaseStoriesCached = unstable_cache(
  /* The app home renders twelve rows. A 48-record bounded page leaves room
     for publication filtering without holding on to the outage-era empty
     120-record cache. */
  () => getPublishedCaseStories(48),
  ["published-case-stories-v4"],
  { revalidate: 300 },
);

export const getPublicCareTimelineCached = unstable_cache(
  () => getPublicCareTimeline(720),
  ["public-care-timeline-v2"],
  { revalidate: 300 },
);
