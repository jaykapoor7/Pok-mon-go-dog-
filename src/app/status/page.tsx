import Link from "next/link";
import { DocPage } from "@/sp4/site/kit";
import { StatusLive } from "./StatusLive";
import "./status.css";

export const metadata = { title: "Status, StrayPaw", description: "Whether StrayPaw is working right now, checked live, and how incidents are handled." };

export default function StatusPage() {
  return (
    <DocPage title="System status" eyebrow="StrayPaw">
      <StatusLive />
      <h2>What this page shows</h2>
      <p>A live check made from your browser: that the application answers, and that it can read the database. It tells you what is true at this moment.</p>
      <h2>What it does not show yet</h2>
      <p>StrayPaw does not publish uptime history or a service-level figure today, and this page will not show one until it is measured independently. Email delivery, maps and connected accounts depend on other providers and are not checked here.</p>
      <h2>If something is wrong</h2>
      <p>Field mode keeps working without a connection and sends records when it returns. If the site is not responding, wait a few minutes and try again; nothing you confirmed is lost. Tell us through the <Link href="/contact">Contact page</Link>, with the time and what you were doing.</p>
      <h2>How incidents are handled</h2>
      <p>We investigate, restore service, and tell the admins of affected organisations what happened and what was done. If personal data was exposed, affected organisations are told without undue delay, with what is known, as set out in <Link href="/data-processing">Data processing</Link>.</p>
    </DocPage>
  );
}
