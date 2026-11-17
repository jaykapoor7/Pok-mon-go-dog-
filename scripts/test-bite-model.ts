/* Kaju's bite help on a model: the rails hold whatever the model says. No network: the model is a stand-in. */
import assert from "node:assert/strict";

async function main() {
  let n = 0; const ok = (m: string) => { n++; console.log(`ok ${n} - ${m}`); };
  const { biteTurn, NO_FACTS, railNext, mustAsk, cleanFacts } = await import("../src/lib/kaju/biteModel");
  const env = { STRAYPAW_BITE_AI: "model", STRAYPAW_BITE_AI_AUTHORISED_BY: "owner:2026-11-17", STRAYPAW_BITE_AI_DAILY_TURNS: "100" };
  const areas = ["Indiranagar", "Koramangala"];
  const today = "2026-11-17";
  const stand = (input: unknown) => ({ messages: { create: async () => ({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "t", name: "kaju_turn", input }], usage: { input_tokens: 1, output_tokens: 1 } }) as never } });
  const turn = (input: unknown, facts = NO_FACTS, showing = "tell") => biteTurn({ turns: [{ who: "me", text: "A street dog bit me near 100 Feet Road in Indiranagar this morning" }], facts, showing, areas, programme: "Bengaluru", mode: "chat", today }, undefined, env, stand(input));

  const a = await turn({ reply: "That sounds frightening. A street dog bit you in Indiranagar this morning.", next: "where", quick: [], facts: { kind: "bite", species: "dog", ownership: "community", area: "Indiranagar", place: "near 100 Feet Road", on: today, when: "this morning" } });
  assert.ok(a); assert.equal(a.next, "danger"); assert.equal(a.facts.area, "Indiranagar"); assert.equal(a.facts.on, today);
  ok("the safety question comes first, whatever the model asks; facts from one sentence are kept");

  const b = await turn({ reply: "Which area?", next: "where", quick: [], facts: { area: "Atlantis", on: "2025-01-01", phone: "12" } }, { ...NO_FACTS, kind: "bite", species: "dog", area: "Indiranagar", danger: "no", notify: "yes" }, "where");
  assert.ok(b); assert.equal(b.facts.area, "Indiranagar", "an area outside the programme is ignored"); assert.equal(b.facts.on, null, "a date over 30 days old is ignored"); assert.equal(b.facts.phone, null);
  assert.equal(b.next, "when"); assert.equal(b.fixed, true); assert.equal(b.reply, "When did it happen?");
  ok("a question already answered is never asked again: the next missing one is asked instead");

  const c = await turn({ reply: "Sending it now.", next: "send", quick: [], facts: {} }, { ...NO_FACTS, kind: "bite", species: "dog", area: "Indiranagar", on: today, danger: "no", notify: "yes" }, "looks");
  assert.ok(c); assert.notEqual(c.next, "send", "nothing is sent before the person has seen the report");
  const full = { ...NO_FACTS, kind: "bite" as const, species: "dog" as const, area: "Indiranagar", on: today, danger: "no" as const, notify: "yes" as const, looks: "brown", callback: "no" as const };
  assert.equal((await turn({ reply: "Done.", next: "send", quick: [], facts: {} }, full, "review"))?.next, "send");
  assert.equal((await turn({ reply: "Done.", next: "send", quick: [], facts: {} }, full, "where"))?.next, "review");
  ok("send only from the report the person is looking at");

  const d = await turn({ reply: "Okay.", next: "looks", quick: ["Brown"], facts: { skipped: ["looks", "nonsense"] } }, { ...full, looks: null, callback: null }, "looks");
  assert.ok(d); assert.deepEqual(d.facts.skipped, ["looks"]); assert.equal(d.next, "call");
  ok("a skipped detail is never asked again");

  assert.equal(mustAsk({ ...NO_FACTS, kind: "bite", danger: "yes" }), "where", "no separate 'tell the clinic?': sending the report is that decision");
  assert.equal(railNext("notify", { ...NO_FACTS, kind: "bite", danger: "no", area: "Indiranagar" }, "where").next, "when");
  assert.equal(mustAsk({ ...NO_FACTS, kind: "bite", danger: "no", notify: "no" }), "centres");
  assert.equal(railNext("review", { ...NO_FACTS, kind: "bite", danger: "no", notify: "yes", pinned: true }, "where").next, "when");
  assert.equal(cleanFacts({ phone: "+91 98450 12345" }, areas, today).phone, "919845012345");
  ok("danger, then only what is missing (where, when, the animal); the clinic question is the report's Send; a pin counts as where");

  const g = await turn({ reply: "That sounds painful.", next: "looks", quick: ["Street dog"], facts: { kind: "bite", species: "dog", area: "Indiranagar", on: today, danger: "no" } });
  assert.ok(g); assert.equal(g.facts.danger, null, "the model cannot clear the safety check"); assert.equal(g.next, "danger"); assert.deepEqual(g.quick, []);
  const h = await turn({ reply: "Okay.", next: "where", quick: [], facts: { danger: "no" } }, { ...NO_FACTS, kind: "bite", species: "dog" }, "danger");
  assert.ok(h); assert.equal(h.facts.danger, "no", "the person's own answer to the safety question clears it");
  const k = await turn({ reply: "Call 108 now.", next: "where", quick: [], facts: { danger: "yes" } }, { ...NO_FACTS, kind: "bite", species: "dog" }, "looks");
  assert.ok(k); assert.equal(k.facts.danger, "yes", "danger can be raised at any moment");
  ok("only the person's answer clears the safety check; the model may raise danger, never assume it away");

  const e = await biteTurn({ turns: [{ who: "me", text: "hi" }], facts: NO_FACTS, showing: "tell", areas, programme: "B", mode: "chat", today }, undefined, {}, stand({ reply: "x", next: "none" }));
  assert.equal(e, null);
  ok("off unless switched on: the page keeps its fixed rules");
  console.log(`\nbite model: ${n} checks passed`);
}
main().catch((e) => { console.error(e); process.exit(1); });
