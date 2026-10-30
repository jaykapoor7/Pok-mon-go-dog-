/* The records each operator route returns, as the routes select them. */

import type { DogStatus } from "@/lib/types";

export type CheckRow = { id: string; label: string; ok: boolean };
export type Sighting = {
  id: string; reporter_name: string | null; zone: string | null; nickname: string | null; photo_url: string | null; notes: string | null;
  mood_tags: string[] | null; created_at: string; claimed_dog_id: string | null; volunteer_name: string | null;
  reporter_kind?: "organisation" | "signed-in" | "guest"; checks?: CheckRow[]; passes?: boolean;
};

export type PartnerRequest = { id: string; user_id: string; org_name: string; area: string | null; contact: string | null; message: string | null; email: string | null; created_at: string };
export type Grant = { id: string; email: string; org_name: string; created_at: string };
export type PartnersRead = { requests: PartnerRequest[]; grants: Grant[] };

export type ContentReport = { id: string; reason: string; details: string | null; link: string | null; reporter_email: string | null; status: string; created_at: string; resolution?: string | null };
export type Feedback = { id: string; kind: string; message: string; page: string | null; email: string | null; status: string; resolution: string | null; created_at: string };

export type PendingCase = {
  id: string; title: string; zone: string | null; resolution: string | null; outcome_note: string | null;
  before_url: string | null; after_url: string | null; assignee_name: string | null; resolved_at: string | null; dog_id: string | null;
};

export type Dog = {
  id: string; name: string | null; zone: string | null; status: DogStatus | null; needs_help: boolean | null;
  vaccinated: boolean | null; sterilised: boolean | null; is_friendly: boolean | null; ear_notch: string | null;
  cover_photo: string | null; photo_sensitive: boolean | null; last_seen: string | null; ngo_id: string | null;
  created_by_id: string | null; created_by_name: string | null; ngos: { name: string } | { name: string }[] | null;
};

export type FeedingZone = { id: string; name: string; zone: string | null; created_by_name: string | null; volunteer_count: number | null; last_fed_at: string | null; created_at: string };

export type Fundraiser = {
  id: string; title: string; category: string | null; goal_amount: number | null; raised_reported: number | null; donate_url: string;
  created_by_id: string | null; created_by_name: string | null; status: string; featured: boolean; created_at: string;
};

export type Helper = { id: string; name: string; contact: string; message: string | null; is_ngo: boolean; ngo_name: string | null; dog_id: string | null; zone: string | null; created_at: string; acknowledged: boolean; routed_ngo_id?: string | null };
export type HelpersRead = { volunteers: Helper[]; ngos: Helper[] };

export type Invite = { id: string; email: string; name: string | null; role: string; code: string | null; accepted: boolean; last_used_at?: string | null; revoked: boolean; uses: number; by_org: boolean };
export type VolunteerCode = { id: string; email: string | null; name: string | null; code: string; active: boolean; reports: number };
export type Org = {
  id: string; name: string; slug: string; city: string | null; verified: boolean; members: number; animals: number; active_codes: number;
  invites?: Invite[]; volunteer_codes?: VolunteerCode[];
};

export type Overview = {
  record: { animals: number; treated: number | null; requests: number; cities: number; sterilised: number; vaccinated: number; clinical: { city: string; animals: number }[]; topCities: { city: string; animals: number; requests: number; clinical: boolean }[] };
  source: { animals: number | null; requests: number | null; liveSightings: number | null };
  pipeline: {
    queue: { city: string; requested_at: string; reason: string | null }[];
    mapBuiltAt: string | null;
    imports: { id: string; org: string; file: string | null; status: string; total: number | null; imported: number | null; held: number | null; created_at: string; completed_at: string | null }[];
  };
  orgs: { id: string; name: string; city: string | null; verified: boolean }[];
  week: { animals: number; requests: number; sightings: number };
  last: { sighting: string | null; request: string | null };
  settings: { autoApproval: boolean; photoCheck: boolean };
  at: string;
};

export type SectionId =
  | "today" | "arrivals" | "sightings" | "partners" | "reports" | "feedback" | "verify"
  | "orgs" | "imports" | "enrich"
  | "dogs" | "feeding" | "fundraisers"
  | "volunteers" | "ngos";

/** One thing that came in: a sighting in any status, or a request opened in StrayPaw (/api/admin/arrivals). */
export type Arrival = {
  id: string; kind: "sighting" | "request"; at: string; status: string;
  source: "community" | "organisation"; by: string; org: string | null;
  title: string; place: string | null; photo: string | null; notes: string | null;
  animal: string | null; code: string | null; channel: string | null; demo: boolean;
};
export type ArrivalsRead = { arrivals: Arrival[]; week: number };
