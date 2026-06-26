"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HeartHandshake, MapPin, HandHelping } from "lucide-react";
import { useDemoMode } from "@/components/demo/DemoModeProvider";
import { demoDogs } from "@/lib/demo-sightings";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { HelperForm, type HelperTarget } from "@/components/help/HelperForm";
import { markerStateFor, MARKER_META } from "@/lib/marker-state";
import { distanceMeters, dogLabel } from "@/lib/utils";
import type { Dog } from "@/lib/types";

export function HelpClient({ dogs: realDogs }: { dogs: Dog[] }) {
  const { demoOn } = useDemoMode();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [target, setTarget] = useState<HelperTarget | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { timeout: 5000 }
    );
  }, []);

  const dogs = useMemo(
    () => (demoOn ? [...realDogs, ...demoDogs] : realDogs),
    [demoOn, realDogs]
  );

  // Dogs that need help, nearest first (or most recent if no location).
  const needy = useMemo(() => {
    const list = dogs.filter((d) => d.needs_help);
    if (coords) {
      return [...list].sort(
        (a, b) => distanceMeters(coords, a) - distanceMeters(coords, b)
      );
    }
    return [...list].sort((a, b) => +new Date(b.last_seen) - +new Date(a.last_seen));
  }, [dogs, coords]);

  function helpDog(dog: Dog) {
    setTarget({ dogId: dog.id, zone: dog.zone, label: dogLabel(dog) });
    setFormOpen(true);
  }
  function helpGeneral() {
    setTarget(null);
    setFormOpen(true);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-20 sm:px-6">
      {/* hero */}
      <div className="card overflow-hidden">
        <div className="bg-paw-500 p-6 text-white">
          <h1 className="font-display text-2xl font-extrabold tracking-tightest sm:text-3xl">
            Dogs near you need help
          </h1>
          <p className="mt-1 text-sm text-white/85">
            {needy.length > 0
              ? `${needy.length} ${needy.length === 1 ? "dog" : "dogs"} flagged as needing care${coords ? " near you" : ""}. Even a small hand counts.`
              : "Offer to volunteer or register your rescue — we'll connect you when a dog nearby needs help."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={helpGeneral}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-paw-700"
            >
              <HandHelping className="h-4 w-4" /> I can help
            </button>
            <button
              onClick={() => {
                setTarget(null);
                setFormOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <HeartHandshake className="h-4 w-4" /> Register an NGO
            </button>
          </div>
        </div>
      </div>

      {/* needy feed */}
      <div className="mt-6 space-y-3">
        {needy.length === 0 ? (
          <div className="card p-8 text-center text-sm text-bark-500">
            No dogs are flagged as needing help right now. Thank you for caring —
            tap “I can help” to be on call for when one is.
          </div>
        ) : (
          needy.map((dog) => {
            const meta = MARKER_META[markerStateFor(dog)];
            return (
              <div key={dog.id} className="card flex items-center gap-3 p-3">
                <Link href={`/dog/${dog.id}`} className="shrink-0">
                  <DogPhoto
                    src={dog.cover_photo}
                    alt="Street dog needing help"
                    seed={dog.id}
                    className="h-20 w-20 rounded-2xl"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/dog/${dog.id}`} className="font-semibold hover:text-paw-600">
                    {dogLabel(dog)}
                  </Link>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-bark-500">
                    <MapPin className="h-3.5 w-3.5" /> {dog.zone}
                  </p>
                  <span
                    className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                    style={{ backgroundColor: meta.color }}
                  >
                    {meta.label}
                  </span>
                </div>
                <button
                  onClick={() => helpDog(dog)}
                  className="shrink-0 self-stretch rounded-2xl bg-paw-500 px-4 text-sm font-semibold text-white transition-transform active:scale-95"
                >
                  I can help
                </button>
              </div>
            );
          })
        )}
      </div>

      <p className="mt-6 text-center text-xs text-bark-400">
        Looking for the photo feed?{" "}
        <Link href="/feed" className="font-semibold text-paw-600">
          Browse all sightings
        </Link>
      </p>

      <HelperForm open={formOpen} target={target} onClose={() => setFormOpen(false)} />
    </div>
  );
}
