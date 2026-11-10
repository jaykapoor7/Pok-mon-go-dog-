import Link from "next/link";
import { InfoPage, H2 } from "@/components/info/InfoPage";
import { StatusLive } from "./StatusLive";
import "./status.css";

export const metadata = { title: "Status, StrayPaw", description: "Whether StrayPaw is working right now, checked live, and how incidents are handled." };

export default function StatusPage() {
  return (
    <InfoPage title="System status" eyebrow="StrayPaw">
      <StatusLive />
      <H2>What this page shows</H2>
      <p>A live check made from your browser: that the application answers, and that it can read the database. It tells you what is true at this moment.</p>
      <H2>What it does not show yet</H2>
      <p>StrayPaw does not publish uptime history or a service-level figure today, and this page will not show one until it is measured independently. Email delivery, maps and connected accounts depend on other providers and are not checked here.</p>
      <H2>If something is wrong</H2>
      <p>Field mode keeps working without a connection and sends records when it returns. If the site is not responding, wait a few minutes and try again; nothing you confirmed is lost. Tell us through the <Link href="/contact">Contact page</Link>, with the time and what you were doing.</p>
      <H2>How incidents are handled</H2>
      <p>We investigate, restore service, and tell the admins of affected organisations what happened and what was done. If personal data was exposed, affected organisations are told without undue delay, with what is known, as set out in <Link href="/data-processing">Data processing</Link>.</p>
    </InfoPage>
  );
}
