import { StoriesClient } from "@/components/partner/StoriesClient";

export const metadata = { title: "Public case stories, StrayPaw Partner" };

export default function PartnerStoriesPage() {
  return <div><header className="mb-5"><h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">Public case stories</h1><p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-bark-500">Turn a completed, approved case into a concise public story for the landing page, reports and social work.</p></header><StoriesClient /></div>;
}
