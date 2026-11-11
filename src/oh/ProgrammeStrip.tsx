"use client";

/* On an NGO's or municipal office's own Today: what programme partners are
   waiting for from this team, so a hospital's request reaches the field
   team where they already look. Hidden when the organisation is in no programme. */
import Link from "next/link";
import { ArrowRight, ArrowRightLeft } from "lucide-react";
import { useMembership } from "@/sp/shell/Shell";
import { usePlaces, placeHome } from "./places";

export function ProgrammeStrip() {
  const mem = useMembership();
  const { places } = usePlaces();
  const p = mem.org ? places.find((x) => x.kind === "ngo" && x.ngo_id === mem.org!.id) : null;
  if (!p) return null;
  const open = p.handoffs_open, late = p.handoffs_overdue;
  const prog = p.programmes.map((x) => x.name).join(", ");
  return (
    <Link href={placeHome(p)} className="os-strip" data-tone={late ? "flame" : open ? "blue" : "green"}>
      <span className="os-strip-i" aria-hidden><ArrowRightLeft size={16} /></span>
      <span className="os-strip-t">
        <b>{open ? `${open} request${open === 1 ? "" : "s"} from programme partners` : "No requests from programme partners"}{late ? ` · ${late} overdue` : ""}</b>
        <small>{prog}{open ? " · animals to find and observe after bites, samples and vaccination requests" : ""}</small>
      </span>
      <ArrowRight size={16} aria-hidden className="os-strip-go" />
    </Link>
  );
}
