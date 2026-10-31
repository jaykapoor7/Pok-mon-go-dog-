import { Suspense } from "react";
import { Gateway } from "@/sp3/entry/Gateway";

export const metadata = { title: "Open StrayPaw", robots: { index: false, follow: true } };

export default function AppGatewayPage() {
  return <Suspense fallback={null}><Gateway /></Suspense>;
}
