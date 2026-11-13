import { redirect } from "next/navigation";

/* The single board is retired: the work is two lines, each on its own page. Old links land on Rescues. */
export default function NgoPipelinePage() { redirect("/ngo/rescues"); }
