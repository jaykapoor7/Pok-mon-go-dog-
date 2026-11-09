"use client";

/* Loads the guided demo only on a demonstration build; production never ships it to the page. */
import dynamic from "next/dynamic";
import { DEMO_SITE } from "@/lib/demo-site";

const DemoTour = dynamic(() => import("./DemoTour").then((m) => m.DemoTour), { ssr: false });

export function DemoTourMount() {
  return DEMO_SITE ? <DemoTour /> : null;
}
