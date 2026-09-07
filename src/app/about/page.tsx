import { redirect } from "next/navigation";

/* /about used to be a short page in the register the mission page now
   replaces — "community-powered", "incredible work", and a description of
   one city written before StrayPaw covered the country. Rather than keep a
   weaker duplicate competing with /mission, the route survives so existing
   links and search results still land somewhere sensible. */
export default function AboutPage() {
  redirect("/mission");
}
