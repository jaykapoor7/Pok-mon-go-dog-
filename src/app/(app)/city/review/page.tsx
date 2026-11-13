import { Suspense } from "react";
import { ReviewInbox } from "@/sp/abc/ReviewInbox";

export const metadata = { title: "Package review, StrayPaw Municipality", robots: { index: false, follow: false } };
/* The queue reads ?tab= and ?op= from the address, so it renders on the client. */
export default function Page() { return <Suspense fallback={null}><ReviewInbox /></Suspense>; }
