/* Recording-only partner data. Enabled solely by the local footage runner. */
import type { AnimalRow } from "./animal-actions";
import type { Breakdown, CampaignStats } from "./campaigns";
import type { ProgrammeStats } from "./programme";
import type { Case, NGO } from "./types";

export const isRecordingDemo = process.env.NEXT_PUBLIC_DEMO_RECORDING === "true";
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

export const recordingDemoOrg: NGO = {
  id: "recording-demo-paws-chennai", name: "PAWS Chennai", area: "South Chennai",
  city: "Chennai", state: "Tamil Nadu", logo_url: null, dogs_helped: 1248,
  verified: true, mission: "Street-animal care, ABC and rabies prevention across South Chennai.",
  areas_of_work: ["ABC", "Rabies vaccination", "Rescue"],
};

const records: Array<[string, string, number, number, Case["severity"], Case["status"], Case["category"], number, string | null, number | undefined]> = [
  ["Maya, wound follow-up", "Adyar", 13.0067, 80.2576, "high", "in_progress", "injury", 2, "Anjali Rao", 1],
  ["Three pups near the canal", "Kotturpuram", 13.0188, 80.2448, "critical", "assigned", "rescue", 5, "Ravi Kumar", 0],
  ["ABC pickup, 4th Main Road", "Besant Nagar", 13.0002, 80.2669, "normal", "assigned", "sterilisation", 16, "Meena S.", 2],
  ["Rabies booster, Gandhi Nagar", "Adyar", 13.0038, 80.256, "normal", "in_progress", "vaccination", 28, "Anjali Rao", 2],
  ["Limping dog outside market", "Thiruvanmiyur", 12.9834, 80.2605, "high", "unverified", "injury", 32, null, 1],
  ["Post-op check, Indira Nagar", "Adyar", 12.996, 80.259, "low", "resolved", "sterilisation", 45, "Ravi Kumar", undefined],
  ["Vaccination round, L.B. Road", "Thiruvanmiyur", 12.989, 80.254, "normal", "resolved", "vaccination", 66, "Meena S.", undefined],
  ["Community check-in, Kasturba Nagar", "Adyar", 13.011, 80.25, "low", "resolved", "other", 88, "Anjali Rao", undefined],
  ["Skin treatment review", "Velachery", 12.982, 80.219, "normal", "in_progress", "injury", 112, "Ravi Kumar", 3],
  ["New litter, school grounds", "Guindy", 13.007, 80.221, "normal", "assigned", "rescue", 144, "Meena S.", 4],
  ["ABC recovery check", "Mylapore", 13.033, 80.267, "low", "resolved", "sterilisation", 170, "Anjali Rao", undefined],
  ["Feeder escalation", "Nungambakkam", 13.06, 80.242, "normal", "resolved", "other", 198, "Ravi Kumar", undefined],
];

export const recordingDemoCases: Case[] = records.map(([title, zone, lat, lng, severity, status, category, hours, assignee, followUp], index) => ({
  id: `recording-demo-case-${index + 1}`, dog_id: `recording-demo-animal-${index + 1}`, title,
  description: "Demo record for the PAWS Chennai recording workspace.", zone, lat, lng, severity, category,
  tags: category === "injury" ? ["medical", "field follow-up"] : ["field team"], status,
  resolution: status === "resolved" ? (category === "sterilisation" ? "sterilized" : "treated") : null,
  assignee_id: assignee ? `recording-demo-${assignee.toLowerCase().replace(/\W+/g, "-")}` : null,
  assignee_name: assignee, ngo_id: recordingDemoOrg.id, created_by_id: "recording-demo-community",
  created_by_name: "Community report", created_at: hoursAgo(hours + 20), updated_at: hoursAgo(hours),
  last_activity_at: hoursAgo(hours), due_at: followUp === 0 ? hoursAgo(-4) : null,
  follow_up_at: followUp === undefined ? null : daysFromNow(followUp),
  resolved_at: status === "resolved" ? hoursAgo(Math.max(4, hours - 12)) : null,
  before_url: null, after_url: null, outcome_note: status === "resolved" ? "Follow-up completed by the PAWS field team." : null,
  proof_verified: status === "resolved", verified_at: status === "resolved" ? hoursAgo(6) : null,
  cost_estimate: null, cost_spent: null, species: "dog", medical_notes: null, photos: [],
}));

export const recordingDemoAnimals: AnimalRow[] = recordingDemoCases.map((c, index) => ({
  id: c.dog_id!, straypaw_id: `SP-D-DM${String(index + 1).padStart(4, "0")}`, name: ["Maya", "Kavi", "Tara", "Muthu", "Chotu", "Nila"][index % 6],
  code: `PC-${String(204 + index).padStart(3, "0")}`, species: "dog", zone: c.zone ?? "Chennai",
  status: c.status === "resolved" ? "sterilised" : c.severity === "high" || c.severity === "critical" ? "injured" : "seen",
  cover_photo: "", assignee_name: c.assignee_name, last_seen: c.last_activity_at, lat: c.lat ?? 0, lng: c.lng ?? 0,
}));

export const recordingDemoProgramme: ProgrammeStats = {
  total: 1248, sterilised: 834, not_sterilised: 211, ster_unknown: 203,
  vaccinated: 791, not_vaccinated: 184, vacc_unknown: 273, needs_help: 38,
  added_7d: 46, added_30d: 184, ster_pct_of_known: 80, ster_pct_of_all: 67, vacc_pct_of_known: 81,
};

const campaign: CampaignStats = {
  id: "recording-demo-adyar-abc", name: "Adyar ABC & rabies round", kind: "sterilisation",
  starts_on: "2026-09-01", ends_on: "2026-09-30", zone: "Adyar", archived: false,
  observations: 312, people: 18, total: 312, sterilised: 219, not_sterilised: 52, ster_unknown: 41,
  vaccinated: 204, not_vaccinated: 43, vacc_unknown: 65, needs_help: 12,
  ster_pct_of_known: 81, ster_pct_of_all: 70, vacc_pct_of_known: 83, vacc_pct_of_all: 65,
};

export const recordingDemoBreakdown: Breakdown = {
  overall: campaign,
  drives: [campaign, { ...campaign, id: "recording-demo-thiruvanmiyur", name: "Thiruvanmiyur vaccination round", kind: "vaccination", zone: "Thiruvanmiyur", total: 188, observations: 188, people: 11 }],
  unfiled: { animals: 17, sterilised: 4, not_sterilised: 9, ster_unknown: 4 },
  waiting: { ours: 17, community: 28 },
};
