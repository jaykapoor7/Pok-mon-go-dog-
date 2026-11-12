"use client";

/* ════════════════════════════════════════════════════════════════════
   Kaju, StrayPaw's AI agent, in the app: one conversation, three sizes.
   The puppy is Kaju's mascot; his pose follows what the agent is really
   doing (useKajuMood): greeting on open, thinking while /api/ai works,
   pleased after an answer, concerned on an error, settling when closed.
     · the launcher (sidebar button, top bar, ⌘J, phone tab)
     · the right-side panel, docked beside any page
     · the full-screen workspace at /assistant
   Answers come from /api/ai, which reads with the person's own session.
   Proposed changes are shown as cards and saved only on Confirm, through
   the same actions as the manual screens (./execute).
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Copy, Paperclip, Plug } from "lucide-react";
import { ArrowRight, ArrowUp, Check, CheckCircle2, ClipboardList, ExternalLink, Info, Loader2, Maximize2, PawPrint, RotateCcw, Sparkles, TriangleAlert, X, Layers, MapPin, FileText } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabase } from "@/lib/supabase";
import { executeProposal, type Saved } from "./execute";
import type { AiReply, Citation, Proposal } from "./types";
import { isAiReply, safeAiHref, auditReference } from "./validation";
import { Kaju, KajuFace } from "@/kaju/Kaju";
import { MAX_UPLOAD_BYTES, UPLOAD_LIMIT_MESSAGE } from "@/lib/files/limits";
import { useKajuAmbient } from "@/kaju/ambient";
import { useReducedMotion } from "@/kaju/controller";
import type { KajuState } from "@/kaju/poses";
import { isRecordingDemo } from "@/lib/recording-demo";
import { demoExecute, demoKajuReply } from "@/lib/demo/kaju-demo";
import { DemoFileViewer } from "@/sp/demo/FileViewer";
import "./ai.css";
import { KajuHub } from "@/sp/ngo/KajuHub";
import { shortCode } from "@/lib/caseCode";

type Msg = { id: string; role: "user" | "assistant"; text: string; reply?: AiReply; error?: string; retry?:string; display?: string; fileName?: string };
type Ctx = { open: boolean; toggle: () => void; setOpen: (v: boolean) => void; ask: (q: string, extra?: { display?: string; fileName?: string }) => void; msgs: Msg[]; busy: boolean; reset: () => void; stop:()=>void; model: boolean | null; scope:string|null; role:string|null; contextPath:string; scopeError:string|null; refreshScope:()=>void; revision:number; step:string|null; /** Words placed in the composer for the person to finish (from a record's Kaju button). */ draft:string|null; prefill:(t:string)=>void };
const AiCtx = createContext<Ctx | null>(null);
const KEY = "sp3.ai.thread";
const uid = () => Math.random().toString(36).slice(2, 10);

export function useAi(): Ctx {
  const c = useContext(AiCtx);
  return c ?? { open: false, toggle: () => {}, setOpen: () => {}, ask: () => {}, msgs: [], busy: false, reset: () => {}, stop:()=>{}, model: null,scope:null,role:null,contextPath:'/',scopeError:null,refreshScope:()=>{}, revision:0, step:null, draft:null, prefill:()=>{} };
}

/** Kaju's pose, from the agent's real state. Never from a pretend result. */
export function useKajuMood(): KajuState {
  const ai = useAi();
  const [state, setState] = useState<KajuState>("lying");
  const last = ai.msgs[ai.msgs.length - 1];
  const lastKey = last ? `${last.id}:${last.error ? "e" : "a"}` : "";
  const pathname = usePathname();
  const active = ai.open || pathname === "/assistant";
  const prevOpen = useRef(active);
  useEffect(()=>{let timer:number|undefined;const verified=()=>{setState('success');window.clearTimeout(timer);timer=window.setTimeout(()=>setState(active?'listening':'lying'),1600)};window.addEventListener('kaju-action-verified',verified);return()=>{window.clearTimeout(timer);window.removeEventListener('kaju-action-verified',verified)}},[active]);
  useEffect(() => {
    let t: number | undefined;
    if (ai.busy) setState("thinking");
    else if (!active && prevOpen.current) { setState("goodbye"); t = window.setTimeout(() => setState("lying"), 1100); }
    else if (!active) setState("lying");
    else if (last?.role === "assistant" && last.error) setState("concerned");
    else if (last?.role === "assistant" && last.reply) {
      const found = (last.reply.citations?.length ?? 0) > 0 || (last.reply.proposals?.length ?? 0) > 0;
      const incomplete = last.reply.tools.some((tool) => !tool.ok) || last.reply.notice?.includes("incomplete");
      setState(incomplete ? "concerned" : found ? last.reply.proposals.length ? "explaining" : "insight" : "explaining");
      t = window.setTimeout(() => setState("listening"), 1600);
    } else if (active && !prevOpen.current) { setState("greeting"); t = window.setTimeout(() => setState("listening"), 1500); }
    else setState("listening");
    prevOpen.current = active;
    return () => window.clearTimeout(t);
  }, [ai.busy, active, lastKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}

/** The mascot, for any place that shows Kaju's state. */
export function KajuMark({ size = 40, state }: { size?: number; state?: KajuState }) {
  const mood = useKajuMood();
  const [ambient] = useKajuAmbient();
  const reduced = useReducedMotion();
  return <Kaju state={state ?? mood} size={size} still={!ambient || reduced} />;
}

export function AiProvider({ children }: { children: ReactNode }) {
  const {user,ready}=useAuth();
  const identity=user?.id??'guest';
  const [access,setAccess]=useState<{owner:string;scope:string|null;role:string|null;model:boolean|null;error:string|null}>({owner:'',scope:null,role:null,model:null,error:null});
  const version=useRef(0);
  const refreshScope=useCallback(async()=>{
    if(!ready)return;
    const run=++version.current;
    if(isRecordingDemo){setAccess({owner:identity,scope:`demo:${identity}`,role:'coordinator',model:true,error:null});return;}
    try{
      const session=(await getSupabase()?.auth.getSession())?.data.session;
      if((user&&session?.user.id!==user.id)||(!user&&session))throw Error('Your session has changed. Sign in again.');
      const controller=new AbortController();const timer=window.setTimeout(()=>controller.abort(),10000);
      let response:Response;
      try{response=await fetch('/api/ai',{cache:'no-store',signal:controller.signal,headers:session?{Authorization:`Bearer ${session.access_token}`}:{}})}finally{window.clearTimeout(timer)}
      const j=await response.json();
      if(response.status===401)throw Error('Your session has expired. Sign in again.');
      if(!response.ok||typeof j.scope!=='string'||(user&&j.userId!==user.id))throw Error('Your workspace access could not be checked. Try again.');
      if(run===version.current)setAccess({owner:identity,scope:j.scope,role:j.actorRole??null,model:!!j.model,error:null});
    }catch(e){if(run===version.current)setAccess({owner:identity,scope:null,role:null,model:null,error:e instanceof Error?e.message:'Workspace access unavailable.'})}
  },[identity,ready,user]);
  // The counter invalidates async requests; it is not a DOM ref.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{void refreshScope();const check=()=>{if(document.visibilityState==='visible')void refreshScope()};window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);return()=>{version.current++;window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check)}},[refreshScope]);
  const current=access.owner===identity?access:null;
  return <ScopedAiProvider key={identity} identity={identity} access={current} refreshScope={refreshScope}>{children}</ScopedAiProvider>;
}

/** A user, organisation, role or reviewing-office change hides old text immediately. */
function ScopedAiProvider({children,identity,access,refreshScope}:{children:ReactNode;identity:string;access:{scope:string|null;role:string|null;model:boolean|null;error:string|null}|null;refreshScope:()=>void}){
  const path=usePathname()??'/';
  const origin=useRef(path);
  if(path!=='/assistant')origin.current=path;
  const fallback=access?.role==='municipal_reviewer'?'/city':access?.role?'/ngo':'/community';
  const contextPath=path==='/assistant'?(origin.current==='/assistant'?fallback:origin.current):path;
  const scope=access?.scope??null;
  const storageKey=scope?`${KEY}.v2.${encodeURIComponent(scope)}`:null;
  const [open,setOpen]=useState(false);
  const [revision,setRevision]=useState(0);
  const [history,setHistory]=useState<{key:string|null;msgs:Msg[]}>({key:null,msgs:[]});
  const msgs=useMemo(()=>storageKey&&history.key===storageKey?history.msgs:[],[storageKey,history]);
  const setMsgs=useCallback((next:Msg[]|((previous:Msg[])=>Msg[]))=>setHistory(previous=>({key:storageKey,msgs:typeof next==='function'?next(previous.key===storageKey?previous.msgs:[]):next})),[storageKey]);
  const [busy,setBusy]=useState(false);
  const [step,setStep]=useState<string|null>(null);
  const [model,setModel]=useState<boolean|null>(null);
  const request=useRef<AbortController|null>(null);
  const locked=useRef(false);
  const live=useRef(true);
  const currentKey=useRef(storageKey);currentKey.current=storageKey;
  const msgsRef=useRef(msgs);msgsRef.current=msgs;
  const stop=useCallback(()=>{request.current?.abort();request.current=null;locked.current=false;setBusy(false)},[]);
  useEffect(()=>{live.current=true;return()=>{live.current=false;request.current?.abort()}},[]);
  useEffect(()=>{
    stop();setModel(access?.model??null);
    if(!storageKey)return;
    let restored:Msg[]=[];
    try{
      sessionStorage.removeItem(KEY);sessionStorage.removeItem(`${KEY}.${identity}`);
      const saved=JSON.parse(sessionStorage.getItem(storageKey)??'[]');
      if(Array.isArray(saved))restored=saved.slice(-30).filter((m:Msg)=>m&&typeof m.id==='string'&&typeof m.text==='string'&&m.text.length<=24000&&(m.role==='user'||m.role==='assistant'&&(m.reply?isAiReply(m.reply):typeof m.error==='string')));
    }catch{/* Blocked or malformed storage starts a clean conversation. */}
    setHistory({key:storageKey,msgs:restored});
  },[storageKey,identity,stop]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{if(storageKey&&history.key===storageKey)try{sessionStorage.setItem(storageKey,JSON.stringify(history.msgs.slice(-30)))}catch{/* Storage is optional. */}},[storageKey,history]);
  useEffect(()=>{setModel(access?.model??null)},[access?.model]);
  const reset=useCallback(()=>{stop();setMsgs([]);setRevision(v=>v+1)},[stop,setMsgs]);
  const ask=useCallback(async(q:string,extra?:{display?:string;fileName?:string})=>{
    const text=q.trim();if(!text||!scope||locked.current)return;
    const key=storageKey;const controller=new AbortController();request.current=controller;locked.current=true;setBusy(true);setStep(null);
    if(path!=='/assistant')setOpen(true);
    const next=[...msgsRef.current,{id:uid(),role:'user' as const,text,...(extra?.display!==undefined?{display:extra.display}:{}),...(extra?.fileName?{fileName:extra.fileName}:{})}];msgsRef.current=next;setMsgs(next);
    const current=()=>live.current&&currentKey.current===key&&request.current===controller&&!controller.signal.aborted;
    const fail=(error:string)=>setMsgs(m=>[...m,{id:uid(),role:'assistant',text:'',error,retry:text}]);
    let timedOut=false;
    const timer=window.setTimeout(()=>{timedOut=true;controller.abort();if(live.current&&currentKey.current===key){fail('This request timed out. No prepared action was confirmed. Try a narrower question.');locked.current=false;setBusy(false)}},55000);
    try{
      if(isRecordingDemo){const {reply,ms}=demoKajuReply(text,path);await new Promise(resolve=>setTimeout(resolve,ms));if(current())setMsgs(m=>[...m,{id:uid(),role:'assistant',text:reply.text,reply}]);return;}
      const session=(await getSupabase()?.auth.getSession())?.data.session;
      if((identity!=='guest'&&session?.user.id!==identity)||(identity==='guest'&&session))throw Error('Your session changed. Reopen Kaju before continuing.');
      if(!current())return;
      const ws=contextPath.startsWith('/ngo')?'ngo':contextPath.startsWith('/city')?'municipality':contextPath.startsWith('/learn')?'education':'community';
      const response=await fetch('/api/ai',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json',Accept:'application/x-ndjson, application/json',...(session?{Authorization:`Bearer ${session.access_token}`}:{})},body:JSON.stringify({messages:next.slice(-12).map(m=>({role:m.role,text:m.reply?.text??m.text})),context:{path:contextPath,workspace:ws,scope}})});
      let data:any=null;
      /* Streamed replies: show each record check as it finishes, then the answer. */
      if(response.ok&&response.body&&response.headers.get('content-type')?.includes('application/x-ndjson')){
        const reader=response.body.getReader();const dec=new TextDecoder();let buf='';
        for(;;){const {done,value}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});let i:number;
          while((i=buf.indexOf('\n'))>=0){const line=buf.slice(0,i).trim();buf=buf.slice(i+1);if(!line)continue;let ev:any;try{ev=JSON.parse(line)}catch{continue}
            if(!current())return;
            if(ev?.type==='progress'&&typeof ev.tool==='string')setStep(`${TOOL_STEP[ev.tool]??'Checking records'}${typeof ev.summary==='string'&&ev.summary?`: ${ev.summary}`:''}`);
            else if(ev?.type==='reply')data=ev.reply;
            else if(ev?.type==='error')throw Error(typeof ev.error==='string'?ev.error:'Kaju could not answer. Nothing was changed.');}}
      }else data=await response.json().catch(()=>null);
      if(!current())return;
      if(response.status===401||response.status===409){stop();setHistory({key:null,msgs:[]});refreshScope();return;}
      if(!response.ok)throw Error(typeof data?.error==='string'?data.error:'Kaju could not answer. Try again.');
      if(!isAiReply(data)||data.scope!==scope)throw Error('Kaju returned an incomplete response. No action was confirmed. Try again.');
      setModel(data.engine==='model');setMsgs(m=>[...m,{id:uid(),role:'assistant',text:data.text,reply:data}]);
      if(data.tools.some(t=>t.name==='operations_insights'&&t.ok))window.dispatchEvent(new Event('kaju-check-completed'));
    }catch(e){if(current()&&!timedOut)fail(e instanceof Error?e.message:'Could not reach StrayPaw. Try again.');}
    finally{window.clearTimeout(timer);if(live.current&&request.current===controller){locked.current=false;setBusy(false);setStep(null);request.current=null}}
  },[scope,storageKey,path,contextPath,identity,setMsgs,stop,refreshScope]);
  const cancel=useCallback(()=>{const pending=locked.current;stop();if(pending)setMsgs(m=>[...m,{id:uid(),role:'assistant',text:'Stopped waiting. No prepared action was confirmed.',reply:{text:'Stopped waiting. No prepared action was confirmed.',engine:'tools',tools:[],citations:[],proposals:[]}}])},[stop,setMsgs]);
  const [draft,setDraft]=useState<string|null>(null);
  const prefill=useCallback((t:string)=>{setDraft(t);setOpen(true)},[]);
  /* Elsewhere in the page (the guided demo) can ask Kaju a question on the person's behalf: window "sp:kaju-ask" with { q }. */
  useEffect(()=>{const on=(e:Event)=>{const q=(e as CustomEvent<{q?:string}>).detail?.q;if(typeof q==='string'&&q.trim())void ask(q.trim())};window.addEventListener('sp:kaju-ask',on);return()=>window.removeEventListener('sp:kaju-ask',on)},[ask]);
  const value=useMemo<Ctx>(()=>({open,setOpen,toggle:()=>setOpen(v=>!v),ask,msgs,busy,reset,stop:cancel,model,scope,role:access?.role??null,contextPath,scopeError:access?.error??null,refreshScope,revision,step,draft,prefill}),[draft,prefill,open,ask,msgs,busy,reset,cancel,model,scope,access?.role,access?.error,contextPath,refreshScope,revision,step]);
  return <AiCtx.Provider value={value}>{children}{isRecordingDemo&&<DemoFileViewer/>}</AiCtx.Provider>;
}

const connectionsHref = (path: string) => (path.startsWith("/city") ? "/city/connections" : "/ngo/settings/connections");

/* Plain words for each record check, shown while Kaju works. */
const TOOL_STEP: Record<string, string> = {
  search_records: "Searching records", work_summary: "Reading today's work", find_missing_evidence: "Checking evidence", find_duplicates: "Checking for duplicates",
  find_by_identifier: "Looking up the identifier", programme_report: "Reading programme figures", prepared_work: "Finding work that needs a person",
  prepare_intake: "Reading the field messages", check_package: "Checking the package", abc_verification_status: "Reading the verification queue",
  abc_package_status: "Reading report packages", recent_confirmed_actions: "Verifying confirmed actions", operations_insights: "Running operational checks",
  search_knowledge: "Searching the academy", extract_field_message: "Reading the message", propose_case: "Preparing a case", propose_note: "Preparing a note",
  propose_followup: "Preparing a follow-up", propose_care: "Preparing a care record", navigate: "Finding the screen",
};

/* ── suggestions, by where the person is ─────────────────────────── */
function suggestions(path: string): string[] {
  if (/\/ngo\/animals\/[0-9a-f-]{36}$/.test(path)) return ["Summarise this animal's history", "Which records are missing evidence?", "Find possible duplicate animals"];
  if (path === "/city/insights") return ["Which submissions have waited longest?", "Check the claims in the waiting packages", "What can only a municipal reviewer accept?"];
  if (path.startsWith("/workspace") || path.startsWith("/programme") || path === "/today") return ["What are programme partners waiting for?", "What can you do?", "Open the academy"];
  if (path.startsWith("/research")) return ["What programmes are published?", "Show published ABC programmes", "How do I request record-level data?"];
  if (path.startsWith("/ngo/training")) return ["Search the academy for safe capture", "What training is available?", "Open the academy"];
  if (/\/ngo\/(cases|verification)\/[^/]+$/.test(path)) return ["Check this case and its evidence", "What needs attention on this case?", "What can only the veterinarian authorise?"];
  if (/\/(?:ngo\/packages|city\/review)\/[^/]+$/.test(path)) return ["Check this report package", "Show the municipal review queue", "What can only a municipal reviewer accept?"];
  if (path.startsWith("/ngo/packages") || path.startsWith("/ngo/contracts")) return ["Prepare this month's package", "Which records block this month's bill?", "Explain how the bill is calculated"];
  if (path.startsWith("/ngo/work")) return ["What should I do first today, and why?", "Which critical cases have nobody assigned?", "What follow-ups are overdue?"];
  if (path === "/city/review" || path.startsWith("/city/contracts")) return ["Which submissions have waited longest?", "Check the claims in the waiting packages", "Show operator outcomes this month"];
  if (path.startsWith('/ngo/verification')) return ["Show my ABC verification queue", "Which records need veterinary authorisation?", "Run operational checks"];
  if (path.startsWith("/ngo/animals")) return ["Find possible duplicate animals", "Which animals have no photo?", "What can I search in the register?"];
  if (path.startsWith("/ngo/programmes")) return ["Summarise our programmes", "Which records are missing evidence?", "Show published ABC programmes"];
  if (path.startsWith("/ngo/inbox") || path.startsWith("/ngo/field")) return ["Summarise today's work", "Help me prepare a field update", "What follow-ups are overdue?"];
  if (path.startsWith("/ngo")) return ["Run operational checks", "Summarise today's work", "What are programme partners waiting for?", "Which records are missing evidence?", "Find possible duplicate animals", "Open the import screen"];
  if (path.startsWith("/city")) return ["Show the municipal review queue", "What can only a municipal reviewer accept?", "Open the city report"];
  if (path.startsWith("/learn")) return ["Open the academy", "What programmes are published?"];
  return ["What programmes are published?", "Search for animals in Coimbatore", "How do I report an animal?"];
}

/* ── the docked panel ─────────────────────────────────────────────── */
export function AiPanel() {
  const ai = useAi();
  const here = usePathname() ?? "";
  const ref = useRef<HTMLElement>(null);
  // Capture the launcher before the thread's passive autofocus runs.
  useLayoutEffect(() => {
    if (!ai.open || here === '/assistant') return;
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const timer=window.setTimeout(()=>ref.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus({preventScroll:true}),50);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && ref.current?.contains(document.activeElement)) ai.setOpen(false); };
    document.addEventListener("keydown", esc);
    return () => {window.clearTimeout(timer);document.removeEventListener("keydown", esc);if(previous?.isConnected)previous.focus({preventScroll:true})};
  }, [ai.open,here]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ai.open || here === '/assistant') return null;
  return (
    <aside ref={ref} className="ai3-panel" aria-label="Kaju">
      <header className="ai3-head">
        <span className="kaju-head-mark"><KajuMark size={46} /></span><b>Kaju</b><span className="ai3-head-sub">StrayPaw&rsquo;s AI agent</span>
        <span className="ai3-head-act">
          <button type="button" className="ai3-icon" onClick={ai.reset} aria-label="New conversation" title="New conversation"><RotateCcw size={15} /></button>
          <Link className="ai3-icon" href={connectionsHref(ai.contextPath)} aria-label="Manage connections" title="Manage connections"><Plug size={15} /></Link>
          <Link className="ai3-icon" href="/assistant" aria-label="Open full screen" title="Open full screen"><Maximize2 size={15} /></Link>
          <button type="button" className="ai3-icon" onClick={() => ai.setOpen(false)} aria-label="Close Kaju"><X size={16} /></button>
        </span>
      </header>
      <Thread key={`${ai.scope??'pending'}:${ai.revision}`} />
    </aside>
  );
}

/* ── full screen (/assistant) ─────────────────────────────────────── */
export function AiWorkspace() {
  const ai = useAi();
  return (
    <div className="ai3-full">
      <div className="ai3-full-in">
        <header className="ai3-full-head">
          <div className="ai3-full-id"><span className="ai3-full-kaju"><KajuMark size={96} /></span><div><span className="s3-eyebrow">StrayPaw&rsquo;s AI agent</span><h1>Ask Kaju.</h1><p>Check your records. Prepare the next step. You confirm every change.</p></div></div>
          <span className="ai3-full-acts"><Link className="s3-btn is-line is-sm" href={connectionsHref(ai.contextPath)}><Plug size={14} />Manage connections</Link>{ai.msgs.length > 0 && <button type="button" className="s3-btn is-line is-sm" onClick={ai.reset}><RotateCcw size={14} />New conversation</button>}</span>
        </header>
        {ai.msgs.length === 0 && <KajuHub />}
        <Thread key={`${ai.scope??'pending'}:${ai.revision}`} full />
      </div>
    </div>
  );
}

function Thread({ full = false }: { full?: boolean }) {
  const ai = useAi();
  const router = useRouter();
  const path = usePathname() ?? "/";
  const { user } = useAuth();
  const [q, setQ] = useState("");
  /* A record's Kaju button places its words here; the person finishes them and sends. */
  useEffect(() => { if (!ai.draft) return; setQ(ai.draft); window.setTimeout(() => { const el = input.current; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 60); }, [ai.draft]);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const follow=useRef(true);
  const reduced=useReducedMotion();
  useEffect(()=>{if(ai.scope&&ai.open&&!full)input.current?.focus({preventScroll:true})},[ai.scope,ai.open,full]);
  /* While Kaju works, follow the bottom; once an answer lands, show it from its question down, so a long reply opens at its start. */
  useEffect(() => {const el=scroll.current;if(!el||!(!ai.msgs.length&&!ai.busy||follow.current))return;
    const behavior=!ai.msgs.length||reduced?'auto':'smooth';
    const q=!ai.busy&&ai.msgs.length?[...el.querySelectorAll<HTMLElement>('.ai3-q')].pop():null;
    if(q&&el.scrollHeight<=el.clientHeight+1){q.scrollIntoView({block:'start',behavior});return;}
    if(q){el.scrollTo({top:Math.max(0,Math.min(el.scrollHeight,el.scrollTop+q.getBoundingClientRect().top-el.getBoundingClientRect().top-8)),behavior});return;}
    el.scrollTo({top:ai.msgs.length||ai.busy?el.scrollHeight:0,behavior})},[ai.msgs.length,ai.busy,reduced]);
  const [file, setFile] = useState<KajuFile | null>(null);
  const [progress, setProgress] = useState<{ name: string; size: number; pct: number; phase: "uploading" | "reading" } | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [fileBusy,setFileBusy]=useState(false);
  const upload=useRef<AbortController|null>(null);
  useEffect(()=>()=>upload.current?.abort(),[]);
  const send = () => {
    if ((!q.trim() && !file) || ai.busy || fileBusy) return;
    if (file) {
      const question = q.trim() || (file.register ? `This looks like an animal register (${file.rows ?? "some"} rows). Summarise it and tell me what importing it would add.` : `Summarise ${file.name} and tell me what in it matters for our work.`);
      /* The file's text travels with the question; the chat shows only the question and the file's name. */
      ai.ask(`${question}\n\n${file.text.slice(0, 12000)}`, { display: question, fileName: file.name });
    } else ai.ask(q);
    setQ(""); setFile(null);
  };
  const importRegister = () => {
    if (!file?.raw) return;
    (window as unknown as { __spPendingImport?: File }).__spPendingImport = file.raw;
    router.push("/ngo/import");
  };
  const attach = async (f: File | undefined) => {
    upload.current?.abort();
    const controller=new AbortController();upload.current=controller;
    setFileBusy(false);setFile(null);
    setFileErr(null);
    if (!f) return;
    if (f.size > MAX_UPLOAD_BYTES) { setFileErr(UPLOAD_LIMIT_MESSAGE); return; }
    if (isRecordingDemo) {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
      const n = Math.max(0, (XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as unknown[]).length - 1);
      setFile({ name: f.name, text: `[${f.name} · ${n} rows]`, size: f.size, label: `Animal register · ${n} rows`, register: true, rows: n, raw: f });
      return;
    }
    try {
      setFileBusy(true); setProgress({ name: f.name, size: f.size, pct: 0, phase: "uploading" });
      const session=(await getSupabase()?.auth.getSession())?.data.session;
      if(controller.signal.aborted)return;
      if(session?.user.id!==user?.id)throw Error('Your session changed. Reopen Kaju before attaching a file.');
      const t=session?.access_token;
      const fd = new FormData(); fd.append("file", f);
      /* Upload with visible progress, then the server reads the file's text. */
      const j = await new Promise<{ name?: unknown; text?: unknown; error?: string }>((resolve, reject) => {
        const x = new XMLHttpRequest(); x.open("POST", "/api/files/read"); if (t) x.setRequestHeader("Authorization", `Bearer ${t}`);
        x.upload.onprogress = (e) => { if (e.lengthComputable) setProgress((p) => p && { ...p, pct: Math.round((e.loaded / e.total) * 100) }); };
        x.upload.onload = () => setProgress((p) => p && { ...p, pct: 100, phase: "reading" });
        x.onload = () => { let body: { name?: unknown; text?: unknown; error?: string } = {}; try { body = JSON.parse(x.responseText); } catch { /* not JSON */ } if (x.status >= 200 && x.status < 300) resolve(body); else reject(new Error(body.error ?? "The file could not be read.")); };
        x.onerror = () => reject(new Error("The upload did not finish. Check the connection and try again."));
        controller.signal.addEventListener("abort", () => x.abort(), { once: true });
        x.send(fd);
      });
      if(controller.signal.aborted)return;
      if(typeof j.name!=='string'||typeof j.text!=='string')throw Error('The file response was incomplete. Attach it again.');
      setFile({ name: j.name, text: j.text, size: f.size, ...(await describeFile(f)), raw: f });
    } catch (e) {if(!controller.signal.aborted)setFileErr((e as Error).message);}
    finally{if(!controller.signal.aborted){setFileBusy(false);setProgress(null)}}
  };
  const sugg = suggestions(ai.contextPath);

  return (
    <div className={`ai3-thread${full ? " is-full" : ""}`}>
      <div ref={scroll} className="ai3-scroll" role="log" aria-label="Kaju conversation" aria-live="polite" aria-relevant="additions" onScroll={()=>{const el=scroll.current;if(el)follow.current=el.scrollHeight-el.scrollTop-el.clientHeight<100}}>
        {ai.scopeError&&<p className="ai3-notice" role="alert">{ai.scopeError} <Link href={`/sign-in?next=${encodeURIComponent(path)}`}>Sign in</Link> <button type="button" className="ai3-inline" onClick={ai.refreshScope}>Check access again</button></p>}
        {!ai.scope&&!ai.scopeError&&<p role="status" className="ai3-notice">Checking workspace access…</p>}
        {ai.msgs.length === 0 && (
          <div className="ai3-empty">
            {!full && <div className="ai3-empty-kaju"><KajuMark size={150} /></div>}
            <p className="ai3-empty-h">{user ? `How can I help, ${user.name.split(" ").find((w) => !w.endsWith(".")) ?? user.name}?` : "Ask about public programmes and animals."}</p>
            <p className="ai3-empty-s">{user ? "I read with your own access, cite the records I use, and prepare changes for you to confirm." : "Sign in to ask about your organisation's records. Public questions work without an account."}</p>
            <div className="ai3-sugg">{sugg.map((s) => <button key={s} type="button" disabled={!ai.scope||ai.busy} onClick={() => ai.ask(s)}><Sparkles size={13} aria-hidden />{s.length > 70 ? `${s.slice(0, 68)}…` : s}</button>)}</div>
          </div>
        )}
        {ai.msgs.map((m) => m.role === "user"
          ? <div key={m.id} className="ai3-q">{m.fileName && <span className="ai3-q-file"><Paperclip size={13} aria-hidden />{m.fileName}</span>}{m.display ?? m.text}</div>
          : <Answer key={m.id} m={m} />)}
        {ai.busy && <RunCard step={ai.step} />}
        <div ref={end} />
      </div>
      <div className="ai3-compose">
        <textarea ref={input} value={q} onChange={(e) => setQ(e.target.value)} rows={full ? 3 : 2} placeholder="Ask Kaju, search, or paste a field update…" aria-label="Message Kaju"
          disabled={!ai.scope} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); follow.current=true;send(); } }} />
        {user && <label className="ai3-attach" title="Attach a PDF, Word, Excel, CSV or PowerPoint file"><Paperclip size={15} aria-hidden /><span className="sr-only">Attach a file</span><input type="file" accept=".pdf,.docx,.xlsx,.xls,.csv,.pptx" onChange={(e) => { void attach(e.target.files?.[0]); e.target.value = ""; }} /></label>}
        {ai.busy?<button type="button" className="ai3-send" onClick={ai.stop} aria-label="Stop waiting"><X size={16}/></button>:<button type="button" className="ai3-send" onClick={()=>{follow.current=true;send()}} disabled={!ai.scope||fileBusy||(!q.trim()&&!file)} aria-label="Send"><ArrowUp size={16} /></button>}
        {progress && <div className="ai3-fc" role="status"><span className="ai3-fc-ico" aria-hidden><Loader2 size={16} className="animate-spin" /></span><span className="ai3-fc-t"><b>{progress.name}</b><small>{progress.phase === "uploading" ? `Uploading · ${progress.pct}%` : "Reading the file…"} · {kb(progress.size)}</small><i className="ai3-fc-bar"><i style={{ width: `${progress.phase === "reading" ? 100 : progress.pct}%` }} /></i></span></div>}
        {fileErr && <div className="ai3-fc is-err" role="alert"><span className="ai3-fc-ico" aria-hidden><TriangleAlert size={16} /></span><span className="ai3-fc-t"><b>Not attached</b><small>{fileErr}</small></span><button type="button" className="ai3-fc-x" onClick={() => setFileErr(null)} aria-label="Dismiss"><X size={14} /></button></div>}
        {file && !progress && <div className="ai3-fc is-ready"><span className="ai3-fc-ico" aria-hidden><Paperclip size={16} /></span><span className="ai3-fc-t"><b>{file.name}</b><small>{file.label} · {kb(file.size)}</small></span>{file.register && <button type="button" className="ai3-fc-act" onClick={importRegister}>Import as register</button>}<button type="button" className="ai3-fc-x" onClick={() => setFile(null)} aria-label={`Remove ${file.name}`}><X size={14} /></button></div>}
        <p className="ai3-foot">{ai.model === false ? "Using record tools. Ask about cases, evidence or reports." : "Answers cite records. Changes need your confirmation."}</p>
      </div>
    </div>
  );
}

function Answer({ m }: { m: Msg }) {
  const router = useRouter();
  const ai=useAi();
  if (m.error) return <div className="ai3-a is-error"><TriangleAlert size={15} aria-hidden /><div><p role="alert">{m.error}</p>{m.retry&&<button type="button" className="ai3-inline" disabled={ai.busy||!ai.scope} onClick={()=>ai.ask(m.retry!)}>Try again</button>}</div></div>;
  const r = m.reply;
  if(!r)return null;
  return (
    <div className="ai3-a is-kaju">
      <span className="ai3-who" aria-hidden><KajuFace size={26} /></span>
      <div className="ai3-body">
        <span className="ai3-name">Kaju{r.engine === "model" ? <i>Model-backed answer</i> : null}{isRecordingDemo ? <i>illustrative demo</i> : null}</span>
        <div className="ai3-text"><Rich text={r.text} /></div>
        {r.proposals.map((p) => <ProposalCard key={p.id} p={p} />)}
        {r.navigate && safeAiHref(r.navigate.href) && <button type="button" className="s3-btn is-sm is-line ai3-go" onClick={() => router.push(r.navigate!.href)}>Open {r.navigate.label}<ArrowRight size={14} /></button>}
        {r.citations.length > 0 && <Sources items={r.citations} />}
        <div className="ai3-meta">
          {r.tools.length > 0 && <ul className="ai3-run-steps is-done" aria-label={`Kaju checked ${r.tools.length} ${r.tools.length === 1 ? "source" : "sources"} in your records`}>{r.tools.slice(0, 5).map((t, i) => <li key={i} className={t.ok ? undefined : "is-off"} style={{ ["--j" as string]: i }}>{t.ok ? <span className="ai3-ok" aria-hidden><Check size={10} strokeWidth={3} /></span> : <span className="ai3-warn" aria-hidden><Info size={10} strokeWidth={3} /></span>}<span>{t.summary}</span></li>)}{r.tools.length > 5 ? <li className="is-more">and {r.tools.length - 5} more</li> : null}</ul>}
          <CopyAnswer text={r.text} />
        </div>
        {r.suggestions && r.suggestions.length > 0 && <div className="ai3-sugg is-next" role="group" aria-label="Next steps">{r.suggestions.slice(0, 4).map((s) => <button key={s} type="button" disabled={ai.busy || !ai.scope} onClick={() => ai.ask(s)}>{s}</button>)}</div>}
        {r.notice && r.engine === "model" && <p className="ai3-notice"><Info size={12} aria-hidden />{r.notice}</p>}
      </div>
    </div>
  );
}

/* Kaju at work, as the landing demo shows it: a run with its steps, each ticked when the next begins, with the time. */
function RunCard({ step }: { step: string | null }) {
  const [steps, setSteps] = useState<{ text: string; at: string }[]>([]);
  const stamp = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  useEffect(() => { setSteps([{ text: "Read your request", at: stamp() }]); }, []);
  useEffect(() => { if (step) setSteps((v) => (v.some((x) => x.text === step) ? v : [...v, { text: step, at: stamp() }])); }, [step]);
  return (
    <div className="ai3-run" role="status" aria-live="polite">
      <div className="ai3-run-h"><span className="ai3-run-who" aria-hidden><KajuMark size={30} state="thinking" /></span><span><b>Kaju is working</b><small>With your access · nothing is saved without you</small></span><em className="ai3-run-tag">Running</em></div>
      <ul className="ai3-run-steps">{steps.map((x, i) => (
        <li key={x.text} style={{ ["--j" as string]: i }}>{i < steps.length - 1 ? <span className="ai3-ok" aria-hidden><Check size={10} strokeWidth={3} /></span> : <span className="ai3-spin" aria-hidden />}<span>{x.text}</span><time>{x.at}</time></li>
      ))}</ul>
    </div>
  );
}

function CopyAnswer({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return <button type="button" className="ai3-copy" aria-label="Copy answer" onClick={() => { void navigator.clipboard?.writeText(text.replace(/\*\*/g, "")).then(() => { setDone(true); window.setTimeout(() => setDone(false), 1600); }).catch(() => {}); }}>{done ? <><Check size={13} aria-hidden />Copied</> : <><Copy size={13} aria-hidden />Copy</>}</button>;
}

const KIND_ICON = { animal: PawPrint, case: ClipboardList, programme: Layers, place: MapPin, page: FileText };
/* Long imported codes read as SPC-47A86E; the full code stays in the tooltip. */
const citeLabel = (l: string) => { const s = shortCode(l, l); return s.length > 28 ? `${s.slice(0, 26)}…` : s; };
function Sources({ items }: { items: Citation[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 6);
  return (
    <div className="ai3-src">
      <span>Sources</span>
      <div>{shown.filter(c=>safeAiHref(c.href)).map((c) => { const I = KIND_ICON[c.kind]??FileText; return <Link key={c.id} href={c.href} title={c.label} className="ai3-cite" {...(c.href.startsWith('https:')?{target:'_blank',rel:'noopener noreferrer'}:{})}><I size={11} aria-hidden />{citeLabel(c.label)}</Link>; })}
        {items.length > 6 && !all && <button type="button" className="ai3-cite is-more" onClick={() => setAll(true)}>+{items.length - 6} more</button>}</div>
    </div>
  );
}

function ProposalCard({ p }: { p: Proposal }) {
  const { user } = useAuth();
  const [state, setState] = useState<"idle" | "busy" | "cancel">("idle");
  const [saved, setSaved] = useState<Saved | null>(null);
  const locked=useRef(false);
  const internal=['open_case','add_note','schedule_followup','record_care'].includes(p.kind);
  const [checking,setChecking]=useState(internal&&!isRecordingDemo);
  useEffect(()=>{let live=true;if(!internal||isRecordingDemo||!user){setChecking(false);return;}void(async()=>{try{const token=(await getSupabase()?.auth.getSession())?.data.session?.access_token;if(!token)return;const response=await fetch(`/api/ai/act?request=${encodeURIComponent(p.id)}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});const receipt=await response.json();if(live&&response.ok&&receipt.verified===true&&typeof receipt.at==='string'&&auditReference(receipt.auditId)!==null&&safeAiHref(receipt.href))setSaved({ok:true,at:receipt.at,what:'Record saved and audit verified',href:receipt.href,verified:true,auditId:auditReference(receipt.auditId)!})}catch{/* A retry still uses the same idempotent proposal. */}finally{if(live)setChecking(false)}})();return()=>{live=false}},[internal,p.id,user]);
  const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const rows: [string, string][] = p.kind === "open_case"
    ? [["Action", "Open a case"], ["Title", p.title], ["City", p.city], ["Place", p.zone ?? "Not given"], ["Category", p.category], ["Severity", p.severity], ["Notes", p.description]]
    : p.kind === "add_note" ? [["Action", "Add a note"], ["Case", p.caseLabel], ["Note", p.note]]
      : p.kind === "schedule_followup" ? [["Action", "Schedule a follow-up"], ["Case", p.caseLabel], ["Due", new Date(p.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })], ["Note", p.note || "—"]]
        : p.kind === "record_care" ? [["Action", "Record a care event"], ["Animal", p.dogLabel], ["Kind", p.careKind], ["Date", p.date ?? "Not given"], ["Notes", p.notes || "—"]]
          : p.kind === "email" ? [["Action", p.send ? `Send from ${p.providerName}` : `Save a draft in ${p.providerName}`], ["To", p.to.join(", ")], ...(p.cc.length ? [["Cc", p.cc.join(", ")] as [string, string]] : []), ["Subject", p.subject], ["Message", p.body]]
            : p.kind === "calendar_event" ? [["Action", `Add to ${p.providerName} calendar`], ["Event", p.title], ["Starts", when(p.start)], ["Ends", when(p.end)], ["Guests", p.attendees.join(", ") || "None"], ["Place", p.location ?? "Not given"]]
              : p.kind === "chat_post" ? [["Action", `Post to Slack`], ["Channel", `#${p.channelName}`], ["Message", p.text]]
                : p.kind === "sms" ? [["Action", "Send an SMS"], ["To", p.to.join(", ")], ["Template values", p.values.join(" · ") || "None"], ["For", p.note || "—"]]
              : [["Action", p.saveTo ? `Download and save to ${p.saveToName}` : "Download"], ["Report", p.title], ["Format", p.format.toUpperCase()]];
  const outside = p.kind === "email" || p.kind === "calendar_event" || p.kind === "chat_post" || p.kind === "sms" || (p.kind === "report_file" && !!p.saveTo);
  async function confirm() {
    if (!user || locked.current || checking || saved?.ok) return;
    locked.current=true;
    setState("busy");
    try {const r = isRecordingDemo ? await demoExecute(p) : await executeProposal(p, { id: user.id, name: user.name });setSaved(r);if(r.ok&&'verified' in r&&r.verified)window.dispatchEvent(new Event('kaju-action-verified'));}
    catch{setSaved({ok:false,error:'The action status is unknown. Retry this same proposal to verify it.'})}
    finally{locked.current=false;setState('idle')}
  }
  if (state === "cancel") return <p className="ai3-notice"><X size={12} aria-hidden />Cancelled. Nothing was saved.</p>;
  return (
    <div className={`ai3-prop${saved?.ok ? " is-done" : ""}`} role="group" aria-label="Prepared change">
      <p className="ai3-prop-h">{saved?.ok ? <><CheckCircle2 size={14} />{p.kind === "email" || p.kind === "calendar_event" || p.kind === "report_file" || p.kind === "chat_post" || p.kind === "sms" ? saved.what : "Saved to the record"}</> : <><Sparkles size={13} />{outside ? "Prepared, not sent" : "Prepared, not saved"}</>}</p>
      {p.why&&<p className="ai3-notice">{p.why}</p>}
      {checking&&<p className="ai3-notice" role="status">Checking for an existing confirmation…</p>}
      <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd tabIndex={v.length>400?0:undefined}>{v}</dd></div>)}</dl>
      {saved && !saved.ok && <p className="s3-err" role="alert">{saved.error}</p>}
      {saved?.ok ? (
        <div className="ai3-prop-act">{saved.href&&safeAiHref(saved.href)&&<Link className="s3-btn is-sm is-line" href={saved.href}>Open the record<ExternalLink size={13} /></Link>}<span className="s3-small">{outside?'Provider response received. Check the connected application for the result.':p.kind==='report_file'?'Report prepared from the records your account can read.':'Source record and audit entry checked.'}{saved.ok&&<time dateTime={saved.at}> {new Date(saved.at).toLocaleString('en-IN')}</time>}</span></div>
      ) : (
        <div className="ai3-prop-act">
          <button type="button" className="s3-btn is-sm is-primary" onClick={confirm} disabled={state === "busy" || checking || !user}>{state === "busy" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}{p.kind === "email" && p.send ? "Confirm and send" : p.kind === "chat_post" ? "Confirm and post" : p.kind === "sms" ? "Confirm and send SMS" : p.kind === "report_file" ? "Confirm and download" : p.kind === "calendar_event" ? "Confirm and add" : "Confirm and save"}</button>
          <button type="button" className="s3-btn is-sm is-ghost" onClick={() => setState("cancel")} disabled={state === "busy"}>Cancel</button>
          {!user && <span className="s3-small">Sign in to save.</span>}
          <span className="ai3-prop-who">{outside ? "Nothing leaves StrayPaw until you confirm." : "Saved in your name, with the time, only when you confirm."}</span>
        </div>
      )}
    </div>
  );
}

/** Minimal, safe rendering: **bold**, bullet lines and paragraphs. No HTML. */
function Rich({ text }: { text: string }) {
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith("**") && part.endsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : <span key={i}>{part}</span>);
  const BUL = /^\s*[-•*]\s+/, NUM = /^\s*\d+[.)]\s+/;
  /* Lines are grouped as they read: runs of bullets, runs of numbered steps, and paragraphs between them. */
  const groups: { kind: "ul" | "ol" | "p"; lines: string[] }[] = [];
  for (const block of text.split(/\n{2,}/)) for (const line of block.split("\n")) {
    if (!line.trim()) continue;
    const kind = BUL.test(line) ? "ul" : NUM.test(line) ? "ol" : "p";
    const last = groups[groups.length - 1];
    if (last && last.kind === kind && kind !== "p") last.lines.push(line); else groups.push({ kind, lines: [line] });
  }
  return <>{groups.map((g, i) => g.kind === "ul" ? <ul key={i}>{g.lines.map((l, j) => <li key={j}>{inline(l.replace(BUL, ""))}</li>)}</ul>
    : g.kind === "ol" ? <ol key={i}>{g.lines.map((l, j) => <li key={j}>{inline(l.replace(NUM, ""))}</li>)}</ol>
    : <p key={i} className={/^\*\*[^*]+\*\*$/.test(g.lines[0].trim()) ? "is-h" : undefined}>{inline(g.lines[0])}</p>)}</>;
}


/* ── attached files ───────────────────────────────────────────────── */
type KajuFile = { name: string; text: string; size: number; label: string; register: boolean; rows?: number; raw?: File };
const kb = (n: number) => n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
/** What kind of file this is, in words, and whether it looks like an animal register. */
async function describeFile(f: File): Promise<{ label: string; register: boolean; rows?: number }> {
  const ext = (f.name.split(".").pop() ?? "").toLowerCase();
  if (ext === "xlsx" || ext === "xls" || ext === "csv") {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as unknown[][];
      const head = (rows[0] ?? []).map((h) => String(h ?? "").toLowerCase()).join(" ");
      const hits = ["name", "zone", "area", "locality", "ward", "steril", "vaccin", "gender", "sex", "colour", "color", "tag", "date", "rescue", "case"].filter((k) => head.includes(k)).length;
      const n = Math.max(0, rows.length - 1);
      return hits >= 2 ? { label: `Animal register · ${n.toLocaleString("en-IN")} rows`, register: true, rows: n } : { label: `Spreadsheet · ${n.toLocaleString("en-IN")} rows`, register: false, rows: n };
    } catch { return { label: "Spreadsheet", register: false }; }
  }
  return { label: ext === "pdf" ? "PDF document" : ext === "docx" ? "Word document" : ext === "pptx" ? "PowerPoint deck" : "Document", register: false };
}
