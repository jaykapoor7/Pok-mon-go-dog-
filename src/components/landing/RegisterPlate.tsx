"use client";

/* The ground under the landing register: the sample city's register being
   written, replayed live. The mechanics are the shared LiveGround; this
   only names the replay and sets the landing's pace. */

import { LiveGround, type GroundData } from "@/components/system/LiveGround";

export type RegisterPlateData = GroundData;

export function RegisterPlate({ plate, running, calm }: { plate: RegisterPlateData; running: boolean; calm: boolean }) {
  return <LiveGround data={plate} running={running} calm={calm} caption={`${plate.city} · the register, replayed`} className="rp" />;
}
