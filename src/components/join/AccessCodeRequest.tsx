"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
export function AccessCodeRequest({ role }: { role: "individual" | "feeder" }) {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [sent, setSent] = useState(false); const [error, setError] = useState("");
  async function submit(e: React.FormEvent) { e.preventDefault(); setError(""); const res = await fetch("/api/access/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, role }) }); if (res.ok) setSent(true); else setError((await res.json()).error ?? "Could not send a code."); }
  return <main className="join-wrap"><div className="join-card"><Link className="join-back" href="/app?choose=1">Back</Link><h1>{sent ? "Check your email" : "Get your StrayPaw code"}</h1><p className="join-lede">{sent ? "Your personal six-character code is on its way. Use it whenever you return, on any device." : "A personal code keeps your StrayPaw space connected across devices. No password to remember."}</p>{sent ? <Link href="/join" className="join-go">Enter my code <ArrowRight size={16}/></Link> : <form onSubmit={submit}><input className="join-code" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} /><input className="join-code mt-3" placeholder="you@email.com" type="email" value={email} onChange={e=>setEmail(e.target.value)} /><button className="join-go mt-4">Send my code <ArrowRight size={16}/></button></form>}{error && <p className="join-error">{error}</p>}</div></main>;
}
