"use client";

import { cn } from "@/lib/utils";

/* ════════════════════════════════════════════════════════════════════
   Sterilisation and vaccination, asked as three-way questions.

   These are the two numbers an ABC and rabies programme is judged on, so
   they are asked plainly rather than hidden behind a tag list. "Not sure"
   is a first-class answer and the default: someone photographing a dog
   from across a road genuinely does not know, and a guess entered here
   becomes a coverage figure later. Recording the not-knowing is what
   makes the answered ones worth counting.

   Two rows of three buttons. It adds no step to the flow.
   ════════════════════════════════════════════════════════════════════ */

export type SterilisationStatus = "sterilised" | "not_sterilised" | "unknown";
export type VaccinationStatus = "vaccinated" | "not_vaccinated" | "unknown";

const STER: { value: SterilisationStatus; label: string }[] = [
  { value: "sterilised", label: "Sterilised" },
  { value: "not_sterilised", label: "Not sterilised" },
  { value: "unknown", label: "Not sure" },
];

const VACC: { value: VaccinationStatus; label: string }[] = [
  { value: "vaccinated", label: "Vaccinated" },
  { value: "not_vaccinated", label: "Not vaccinated" },
  { value: "unknown", label: "Not sure" },
];

function Row<T extends string>({
  legend,
  hint,
  options,
  value,
  onChange,
}: {
  legend: string;
  hint: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-1 block text-sm font-semibold">{legend}</legend>
      <p className="mb-2 text-xs text-bark-400">{hint}</p>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              aria-pressed={on}
              className={cn(
                /* Full-width thirds at a real touch height: this gets used
                   one-handed, outdoors, often in sun. */
                "min-h-[46px] rounded border px-2 py-2 text-[13px] font-semibold transition-colors",
                on
                  ? "border-paw-500 bg-paw-500 text-white"
                  : "border-bark-200 bg-white text-bark-600 hover:border-paw-300 dark:border-white/10 dark:bg-bark-900 dark:text-bark-200"
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ProgrammeStatus({
  sterilisation,
  vaccination,
  onSterilisation,
  onVaccination,
}: {
  sterilisation: SterilisationStatus;
  vaccination: VaccinationStatus;
  onSterilisation: (v: SterilisationStatus) => void;
  onVaccination: (v: VaccinationStatus) => void;
}) {
  return (
    <div className="space-y-4 rounded border border-bark-200 bg-bark-50/60 p-3.5 dark:border-white/10 dark:bg-white/[0.03]">
      <Row
        legend="Sterilised?"
        hint="An ear notch or a clipped ear usually means yes."
        options={STER}
        value={sterilisation}
        onChange={onSterilisation}
      />
      <Row
        legend="Rabies vaccinated?"
        hint="A collar or tag from a vaccination drive is the usual sign."
        options={VACC}
        value={vaccination}
        onChange={onVaccination}
      />
    </div>
  );
}
