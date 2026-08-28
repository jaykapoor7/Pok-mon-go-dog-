import { redirect } from "next/navigation";

// The community app is now the map + report flow. "/app" is kept only so
// existing links and bookmarks land somewhere real.
export default function AppRedirect() {
  redirect("/map");
}
