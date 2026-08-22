import Link from "next/link";
import { CalendarClock, Circle, User } from "lucide-react";
import { getCases } from "@/lib/cases";
import { isOverdue, speciesLabel, type Case } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { CampsSection } from "@/components/partner/CampsSection";
import { TasksSection } from "@/components/partner/TasksSection";

export const dynamic = "force-dynamic";
export const metadata = { title: "Field Work — StrayPaw Partner" };

const isOpen = (c: Case) => c.status !== "resolved" && c.status !== "closed";
const isUrgent = (c: Case) => isOpen(c) && (c.severity === "critical" || c.severity === "high" || isOverdue(c));

export default async function PartnerFieldPage() {
  const cases = await getCases();
  const open = cases.filter(isOpen);

  const tasks = open
    .filter((c) => c.follow_up_at)
    .sort((a, b) => +new Date(a.follow_up_at!) - +new Date(b.follow_up_at!));
  const unassigned = open.filter((c) => !c.assignee_id);

  const byWorker = new Map<string, number>();
  for (const c of open) if (c.assignee_name) byWorker.set(c.assignee_name, (byWorker.get(c.assignee_name) ?? 0) + 1);
  const workers = [...byWorker.entries()].sort((a, b) => b[1] - a[1]);

  // High-need areas — rank zones by open load, weighting urgent cases, so the
  // org can plan camps and allocate resources where the need is greatest.
  const byZone = new Map<string, { total: number; urgent: number }>();
  for (const c of open) {
    const z = (c.zone ?? "").trim() || "Unspecified";
    const cur = byZone.get(z) ?? { total: 0, urgent: 0 };
    cur.total += 1;
    if (isUrgent(c)) cur.urgent += 1;
    byZone.set(z, cur);
  }
  const areas = [...byZone.entries()]
    .map(([zone, v]) => ({ zone, ...v, score: v.urgent * 2 + v.total }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  const maxScore = areas[0]?.score ?? 1;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">Field Work</h1>
        <p className="mt-0.5 text-[13px] text-bark-500">Who is doing what, where, and what remains unfinished.</p>
      </header>

      <div className="space-y-8">
        <TasksSection />

        <Section title={`Case follow-ups due (${tasks.length})`}>
          {tasks.length === 0 ? <Empty>No scheduled field tasks.</Empty> : (
            <List>
              {tasks.map((c) => {
                const overdue = +new Date(c.follow_up_at!) < Date.now();
                return (
                  <Row key={c.id} href={`/partner/cases/${c.id}`}>
                    <CalendarClock className={`h-4 w-4 shrink-0 ${overdue ? "text-status-injured" : "text-status-hungry"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-bark-900 dark:text-bark-50">{c.title}</p>
                      <p className="truncate text-[12px] text-bark-400">{speciesLabel(c.species)}{c.zone ? ` · ${c.zone}` : ""} · {c.assignee_name ?? "Unassigned"}</p>
                    </div>
                    <span className={`shrink-0 text-[12px] tabular-nums ${overdue ? "text-status-injured" : "text-bark-400"}`}>{formatDate(c.follow_up_at!)}</span>
                  </Row>
                );
              })}
            </List>
          )}
        </Section>

        <Section title={`Awaiting assignment (${unassigned.length})`}>
          {unassigned.length === 0 ? <Empty>Everything is assigned.</Empty> : (
            <List>
              {unassigned.map((c) => (
                <Row key={c.id} href={`/partner/cases/${c.id}`}>
                  <Circle className={`h-2.5 w-2.5 shrink-0 fill-current ${c.severity === "critical" || c.severity === "high" ? "text-status-hungry" : "text-bark-300"}`} strokeWidth={0} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-bark-900 dark:text-bark-50">{c.title}</p>
                    <p className="truncate text-[12px] text-bark-400 capitalize">{c.category}{c.zone ? ` · ${c.zone}` : ""}</p>
                  </div>
                </Row>
              ))}
            </List>
          )}
        </Section>

        <Section title={`Field workers (${workers.length})`}>
          {workers.length === 0 ? <Empty>No active assignments.</Empty> : (
            <List>
              {workers.map(([name, count]) => (
                <div key={name} className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-3 last:border-0 dark:border-white/[0.06]">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-bark-100 text-[12px] font-semibold text-bark-500 dark:bg-bark-800">
                    {name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] text-bark-900 dark:text-bark-50">{name}</span>
                  <span className="shrink-0 text-[12px] text-bark-400">{count} open</span>
                </div>
              ))}
            </List>
          )}
        </Section>

        <section>
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-bark-400">High-need areas</h2>
          {areas.length === 0 ? <Empty>No open cases to rank.</Empty> : (
            <div className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
              {areas.map((a) => (
                <div key={a.zone} className="border-b border-black/[0.06] px-4 py-3 last:border-0 dark:border-white/[0.06]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-[14px] font-medium text-bark-900 dark:text-bark-50">{a.zone}</span>
                    <span className="shrink-0 text-[12px] text-bark-400">{a.total} open{a.urgent > 0 ? ` · ${a.urgent} urgent` : ""}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bark-100 dark:bg-bark-800">
                    <div className="h-full rounded-full bg-paw-500" style={{ width: `${Math.round((a.score / maxScore) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <CampsSection />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-bark-400">{title}</h2>
      {children}
    </section>
  );
}
function List({ children }: { children: React.ReactNode }) {
  return <ul className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">{children}</ul>;
}
function Row({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li className="border-b border-black/[0.06] last:border-0 dark:border-white/[0.06]">
      <Link href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">{children}</Link>
    </li>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-black/[0.1] py-8 text-center text-[14px] text-bark-400 dark:border-white/[0.12]">{children}</p>;
}
