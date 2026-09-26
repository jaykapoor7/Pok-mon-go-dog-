import { redirect } from "next/navigation";

/* /partnerships and /for-ngos were two full pages selling the same
   workspace to the same reader: one as a pitch, one as a nine-card feature
   wall. Two pages competing for one job meant neither was the primary path,
   and the card wall is the shape this product deliberately avoids. The pitch
   page won because it is what the homepage footer and the console showcase
   already point at. The route survives so existing links and search results
   still land somewhere sensible, the same way /mission now lands on /about. */
export default function PartnershipsPage() {
  redirect("/for-ngos");
}
