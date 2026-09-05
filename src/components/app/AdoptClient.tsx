"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  Home,
  Loader2,
  Mail,
  Phone,
  Search,
  Syringe,
} from "lucide-react";
import { adoptableAnimals, type AdoptableAnimal } from "@/lib/adoption";

/* Animals an organisation has listed for adoption.

   The list is whatever organisations have actually opened, which early on
   will be nothing. An empty state that says so is the right answer: an
   adoption page padded with examples would have someone contacting a
   number about a dog that does not exist. */

export function AdoptClient() {
  const [rows, setRows] = useState<AdoptableAnimal[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let live = true;
    adoptableAnimals()
      .then((r) => live && setRows(r))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, []);

  const shown = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.name, r.zone, r.org_name, r.summary, r.good_with]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle))
    );
  }, [rows, q]);

  if (rows === null) {
    return (
      <div className="spa-empty">
        <Loader2 size={26} className="imp-spin" />
        <p>Loading listings…</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="spa-empty">
        <Home size={40} strokeWidth={1.25} />
        <h2>No animals are listed for adoption yet</h2>
        <p>
          Listings appear here when a verified organisation opens one. Each is
          an animal already on the map, with the organisation that knows it
          named alongside.
        </p>
        <Link href="/get-involved" className="spa-cta">
          Find a volunteering route <ArrowUpRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="dir-search adopt-search">
        <Search size={15} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, place or organisation"
          aria-label="Search adoption listings"
        />
      </div>
      <p className="spa-mono adopt-count">
        {shown.length === rows.length
          ? `${rows.length} listed`
          : `${shown.length} of ${rows.length} listed`}
      </p>

      {shown.length === 0 ? (
        <p className="spa-lede">
          Nothing matches “{q.trim()}”. Try a place or an organisation name.
        </p>
      ) : (
        <div className="adopt-grid">
          {shown.map((a) => (
            <article key={a.listing_id} className="adopt-card">
              <Link href={`/dog/${a.dog_id}`} className="adopt-photo">
                {a.cover_photo ? (
                  <Image
                    src={a.cover_photo}
                    alt={a.name ? `${a.name}, available for adoption` : "Animal available for adoption"}
                    fill
                    sizes="(max-width: 650px) 100vw, 320px"
                    className="adopt-img"
                    unoptimized
                  />
                ) : (
                  <span className="adopt-nophoto">No photo on file</span>
                )}
              </Link>

              <div className="adopt-body">
                <h3>
                  <Link href={`/dog/${a.dog_id}`}>
                    {a.name?.trim() || "Unnamed animal"}
                  </Link>
                </h3>
                {a.zone && <p className="adopt-where">{a.zone}</p>}

                {a.summary && <p className="adopt-summary">{a.summary}</p>}

                <ul className="adopt-tags">
                  {a.sterilised && <li><Syringe size={11} /> Sterilised</li>}
                  {a.vaccinated && <li><Syringe size={11} /> Vaccinated</li>}
                  {a.good_with && <li>Good with {a.good_with}</li>}
                </ul>

                {a.needs && (
                  <p className="adopt-needs">
                    <b>Needs:</b> {a.needs}
                  </p>
                )}

                <div className="adopt-foot">
                  {a.org_slug ? (
                    <Link href={`/org/${a.org_slug}`} className="adopt-org">
                      {a.org_name}
                    </Link>
                  ) : (
                    <span className="adopt-org">{a.org_name ?? "Listing organisation"}</span>
                  )}
                  <span className="adopt-contact">
                    {a.contact_phone && (
                      <a href={`tel:${a.contact_phone.replace(/\s+/g, "")}`}>
                        <Phone size={13} /> Call
                      </a>
                    )}
                    {a.contact_email && (
                      <a href={`mailto:${a.contact_email}`}>
                        <Mail size={13} /> Email
                      </a>
                    )}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
