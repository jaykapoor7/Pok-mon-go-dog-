/** Canonical destinations. Every navigation surface is derived from this registry.
 * Visibility is fail-closed for restricted destinations; RLS remains authoritative. */
export type WorkspaceId='community'|'ngo'|'city'|'learn'|'health';
export type Role='admin'|'coordinator'|'veterinarian'|'member';
import { publicFlagOn, type Flag } from '@/lib/flags';
export type NavItem={href:string;label:string;icon:string;/** Shown only when this feature flag is on. */flag?:Flag;aliases?:string[];match?:string[];exact?:boolean;short?:string;tone?:string;section?:string;roles?:Role[];reviewer?:boolean;hrefFor?:Partial<Record<Role,string>>;/** Position in the five-step NGO workflow. */step?:number;/** A live count shown beside the link (open work), and its tone. */count?:number|null;countTone?:'flame'|'amber'|'blue';/** Folded under More rather than listed. */more?:boolean;/** Query string that selects a view of the page (e.g. stage=vet). */query?:string;order?:number};
export type Destination=NavItem & {workspace:WorkspaceId;group:string;primary:boolean;mobile?:boolean;primaryFor?:Role[];assistantKey?:string;note?:string;/** false: reached from its hub page and search, not listed in the sidebar. */listed?:boolean};
export type Dest=NavItem & {short?:string};
export type IndexGroup={label:string;links:Destination[]};
export const DESTINATIONS:Destination[]=[
 {workspace:'ngo',href:'/ngo/training',label:'Training',icon:'grad',group:'Organisation',primary:false,note:'Courses, assignments and progress',flag:'training_lms'},
 {workspace:'ngo',href:'/ngo/animals/scan',label:'Scan to find',icon:'paw',group:'Animals',primary:false,note:'Microchip, RFID or QR',flag:'animal_identifiers'},
 {workspace:'ngo',href:'/ngo/readiness',label:'Readiness',icon:'list',group:'Organisation',primary:false,roles:['admin','coordinator'],flag:'readiness_board',listed:false},
 {workspace:'ngo',href:'/ngo/animals/identity',label:'Identity & duplicate review',icon:'paw',group:'Animals',primary:false,roles:['admin','coordinator'],listed:false},
 {workspace:'ngo',href:'/ngo/settings/policies',label:'Workflow policies',icon:'settings',group:'Organisation',primary:false,roles:['admin','coordinator']},
 {workspace:"ngo",href:"/ngo/contracts",label:"Contracts & reconciliation",assistantKey:"contracts",icon:"file",group:"Reports",primary:false,roles:["admin","coordinator"]},
 {workspace:"city",href:"/city/contracts",label:"Contracts & rates",short:"Contracts",icon:"file",group:"Contracts",primary:true,mobile:true,reviewer:true,order:2},
 {workspace:"ngo",href:"/ngo/map",label:"Animal & field map",assistantKey:"field_map",icon:"map",group:"Animals",primary:false},
 {workspace:"city",href:"/city/connections",label:"Connections",icon:"layers",group:"Organisation",primary:false,reviewer:true},
 {workspace:"ngo",href:"/ngo/verification",query:"stage=vet",label:"Treat & sign off",short:"Treat",note:"The vet records the procedure and signs it",icon:"shield",group:"Clinical",primary:true,step:3,order:4,mobile:false,assistantKey:"verification"},
 {workspace:"ngo",href:"/ngo/verification",query:"stage=evidence",label:"Release",short:"Release",note:"Release photo and place",icon:"shield",group:"Clinical",primary:true,step:4,order:5,mobile:false,listed:false},
 {workspace:"ngo",href:"/ngo/programmes/zones",label:"Working zones & assignments",assistantKey:"working_zones",icon:"map",group:"Programmes",primary:false},
  {
    "workspace": "community",
    "href": "/community",
    "assistantKey": "map",
    "label": "Map",
    "icon": "map",
    "match": [
      "/animal"
    ],
    "exact": true,
    "group": "Explore",
    "primary": true,
    "mobile": true
  },
  {
    "workspace": "community",
    "href": "/community/report",
    "assistantKey": "report_animal",
    "label": "Report an animal",
    "icon": "radio",
    "group": "Explore",
    "primary": true,
    "mobile": true
  },
  {
    "workspace": "community",
    "href": "/community/activity",
    "label": "My activity",
    "icon": "activity",
    "group": "Explore",
    "primary": true,
    "mobile": true
  },
  {
    "workspace": "community",
    "href": "/community/stories",
    "label": "Stories",
    "icon": "book",
    "tone": "blue",
    "group": "Explore",
    "primary": true,
    "note": "Documented animals, start to finish"
  },
  {
    "workspace": "community",
    "href": "/community/organisations",
    "label": "Organisations",
    "icon": "building",
    "tone": "teal",
    "group": "Explore",
    "primary": true,
    "note": "Who keeps the record"
  },
  {
    "workspace": "community",
    "href": "/fundraisers",
    "label": "Fundraisers",
    "icon": "heart",
    "tone": "flame",
    "group": "Explore",
    "primary": true
  },
  {
    "workspace": "community",
    "href": "/assistant",
    "label": "Kaju",
    "icon": "kaju",
    "group": "Platform",
    "primary": true
  },
  {
    "workspace": "community",
    "href": "/community/help",
    "label": "If an animal needs help",
    "note": "What to do now, who to call",
    "group": "Help",
    "icon": "file",
    "primary": false
  },
  {
    "workspace": "community",
    "href": "/community/feeding",
    "label": "Feeding spots",
    "note": "For feeders and volunteers",
    "group": "Help",
    "icon": "file",
    "primary": false
  },
  {
    "workspace": "ngo",
    "href": "/ngo",
    "order": 0,
    "label": "Today",
    "icon": "home",
    "exact": true,
    "group": "Today",
    "primary": true,
    "mobile": true
  },
  {
    "workspace": "ngo",
    "href": "/ngo/work",
    "short": "Queue",
    "order": 1,
    "assistantKey": "work",
    "match": ["/ngo/cases"],
    "label": "Work queue",
    "icon": "list",
    "group": "Work",
    "primary": true,
    "mobile": true
  },
  {
    "workspace": "ngo",
    "href": "/ngo/animals",
    "order": 3,
    "step": 2,
    "short": "Animals",
    "assistantKey": "animals",
    "label": "Register animals",
    "icon": "paw",
    "tone": "blue",
    "group": "Animals",
    "primary": true,
    "note": "Every animal on your register",
    "mobile": true
  },
  {
    "workspace": "ngo",
    "href": "/ngo/programmes",
    "section": "Organisation",
    "order": 7,
    "assistantKey": "programmes",
    "label": "Programmes",
    "icon": "layers",
    "tone": "teal",
    "group": "Programmes",
    "primary": true,
    "note": "ABC / ARV drives, surveys",
    "mobile": false
  },
  {
    "workspace": "ngo",
    "href": "/ngo/packages",
    "roles": ["admin", "coordinator"],
    "order": 6,
    "step": 5,
    "short": "Submit",
    "assistantKey": "reports",
    "label": "Submit & bill",
    "icon": "check",
    "tone": "amber",
    "group": "Reports",
    "primary": true,
    "mobile": false
  },
  {
    "workspace": "ngo",
    "href": "/ngo/team",
    "assistantKey": "team",
    "label": "Team & access",
    "icon": "users",
    "tone": "slate",
    "group": "Organisation",
    "primary": false,
    "note": "Members, roles, invitations",
    "mobile": false,
    "roles": [
      "admin"
    ]
  },
  {
    "workspace": "ngo",
    "href": "/assistant",
    "order": 9,
    "label": "Kaju",
    "icon": "kaju",
    "group": "Platform",
    "primary": true,
    "mobile": false
  },
  {
    "workspace": "ngo",
    "href": "/ngo/import",
    "assistantKey": "import",
    "label": "Import your register",
    "note": "Excel or CSV, as your team keeps it",
    "group": "Animals",
    "icon": "file",
    "primary": false,
    "mobile": false,
    "roles": [
      "admin"
    ]
  },
  {
    "workspace": "ngo",
    "href": "/ngo/inbox",
    "aliases": ["intake", "inbox"],
    "section": "Five steps",
    "order": 2,
    "step": 1,
    "short": "Receive",
    "assistantKey": "inbox",
    "label": "Receive reports",
    "note": "Reports and WhatsApp messages, prepared by Kaju",
    "group": "Intake",
    "icon": "file",
    "primary": true,
    "mobile": true
  },
  {
    "workspace": "ngo",
    "href": "/ngo/field",
    "assistantKey": "field",
    "label": "Field mode",
    "note": "Phone, one hand",
    "group": "Work",
    "icon": "file",
    "primary": false,
    "mobile": false
  },
  {
    "workspace": "ngo",
    "href": "/ngo/review",
    "assistantKey": "review",
    "label": "Historical review",
    "note": "Imported statuses, never today's work",
    "group": "Animals",
    "icon": "file",
    "primary": false,
    "listed": false,
    "mobile": false,
    "roles": [
      "admin",
      "coordinator"
    ]
  },
  {
    "workspace": "ngo",
    "href": "/ngo/quality",
    "assistantKey": "quality",
    "label": "Data quality",
    "note": "Gaps and checks in the register",
    "group": "Animals",
    "icon": "file",
    "primary": false,
    "mobile": false,
    "roles": [
      "admin",
      "coordinator"
    ]
  },
  {
    "workspace": "ngo",
    "href": "/ngo/proof",
    "assistantKey": "report_exports",
    "label": "Reports & proof",
    "note": "Evidence on demand",
    "group": "Reports",
    "icon": "file",
    "primary": false,
    "mobile": false,
    "roles": [
      "admin",
      "coordinator"
    ]
  },
  {
    "workspace": "ngo",
    "href": "/ngo/care",
    "assistantKey": "care_ledger",
    "label": "Care ledger",
    "note": "Every care record, across animals",
    "group": "Animals",
    "icon": "file",
    "primary": false,
    "mobile": false
  },
  {
    "workspace": "ngo",
    "href": "/ngo/evidence",
    "label": "Evidence files",
    "note": "Register pages, ledgers, threads",
    "group": "Reports",
    "icon": "file",
    "primary": false,
    "mobile": false
  },
  {
    "workspace": "ngo",
    "href": "/ngo/stories",
    "label": "Publish case stories",
    "group": "Outreach",
    "icon": "file",
    "primary": false,
    "mobile": false,
    "roles": [
      "admin"
    ]
  },
  {
    "workspace": "ngo",
    "href": "/ngo/fundraising",
    "label": "Fundraising",
    "group": "Outreach",
    "icon": "file",
    "primary": false,
    "mobile": false,
    "roles": [
      "admin"
    ]
  },
  {
    "workspace": "ngo",
    "href": "/ngo/volunteers",
    "label": "Volunteer sign-ups",
    "group": "Organisation",
    "icon": "file",
    "primary": false,
    "mobile": false,
    "roles": [
      "admin"
    ]
  },
  {
    "workspace": "ngo",
    "href": "/ngo/feeding",
    "label": "Feeding spots",
    "group": "Programmes",
    "icon": "file",
    "primary": false,
    "mobile": false
  },
  {
    "workspace": "ngo",
    "href": "/ngo/projects",
    "label": "Projects",
    "group": "Programmes",
    "icon": "file",
    "primary": false,
    "mobile": false
  },
  {
    "workspace": "ngo",
    "href": "/ngo/surveys",
    "label": "Surveys & census",
    "group": "Programmes",
    "icon": "file",
    "primary": false,
    "mobile": false
  },
  {
    "workspace": "ngo",
    "href": "/ngo/settings",
    "assistantKey": "settings",
    "label": "Settings",
    "group": "Organisation",
    "icon": "file",
    "primary": false,
    "mobile": false,
    "roles": [
      "admin"
    ]
  },
  {
    "workspace": "ngo",
    "href": "/ngo/cases/new",
    "listed": false,
    "assistantKey": "new_case",
    "label": "New case",
    "icon": "radio",
    "primary": false,
    "group": "Work",
    "mobile": false
  },
  {
    "workspace": "ngo",
    "href": "/ngo/settings/connections",
    "label": "Connections",
    "icon": "layers",
    "primary": false,
    "group": "Organisation",
    "mobile": false,
    "roles": [
      "admin"
    ]
  },
  {
    "workspace": "city",
    "href": "/city/review",
    "section": "From NGOs",
    "order": 1,
    "short": "Review",
    "label": "Review submissions",
    "icon": "check",
    "reviewer": true,
    "group": "Verification",
    "primary": true,
    "mobile": true
  },
  {
    "workspace": "city",
    "href": "/city/insights",
    "order": 4,
    "assistantKey": "insights",
    "label": "Overview",
    "icon": "home",
    "group": "Overview",
    "primary": true,
    "mobile": true
  },
  {
    "workspace": "city",
    "href": "/city/programmes",
    "order": 5,
    "assistantKey": "city_programmes",
    "label": "Programmes",
    "icon": "layers",
    "tone": "teal",
    "group": "Overview",
    "primary": true
  },
  {
    "workspace": "city",
    "href": "/city/report",
    "order": 6,
    "assistantKey": "city_report",
    "label": "Reports",
    "icon": "file",
    "tone": "amber",
    "group": "Reports",
    "primary": true,
    "note": "Print-ready, with sources"
  },
  {
    "workspace": "city",
    "href": "/city",
    "section": "Oversight",
    "order": 3,
    "assistantKey": "city",
    "label": "Wards & map",
    "icon": "map",
    "exact": true,
    "tone": "flame",
    "group": "Wards",
    "primary": true,
    "mobile": true
  },
  {
    "workspace": "city",
    "href": "/assistant",
    "order": 9,
    "label": "Kaju",
    "icon": "kaju",
    "group": "Overview",
    "primary": true
  },
  {
    "workspace": "city",
    "href": "/data-governance",
    "label": "Data governance",
    "group": "Overview",
    "icon": "file",
    "primary": false
  },
  {
    "workspace": "city",
    "href": "/research-standards",
    "label": "Research standards",
    "group": "Overview",
    "icon": "file",
    "primary": false
  },
  {
    "workspace": "learn",
    "href": "/learn",
    "assistantKey": "academy",
    "label": "Learn",
    "icon": "grad",
    "match": [
      "/learn/courses"
    ],
    "exact": true,
    "group": "Explore",
    "primary": true,
    "mobile": true
  },
  {
    "workspace": "learn",
    "href": "/learn/workshops",
    "label": "Workshops",
    "icon": "users",
    "tone": "blue",
    "group": "Modules",
    "primary": true,
    "mobile": true
  },
  {
    "workspace": "learn",
    "href": "/learn/resources",
    "label": "Resources",
    "icon": "book",
    "tone": "teal",
    "group": "Explore",
    "primary": true,
    "mobile": true
  },
  {
    "workspace": "learn",
    "href": "/learn/playground",
    "label": "Playground",
    "icon": "compass",
    "tone": "amber",
    "group": "Explore",
    "primary": true,
    "note": "Illustrative, never a forecast"
  },
  {
    "workspace": "learn",
    "href": "/assistant",
    "label": "Kaju",
    "icon": "kaju",
    "group": "Platform",
    "primary": true
  },
  {
    "workspace": "learn",
    "href": "/education",
    "label": "Education at StrayPaw",
    "note": "For schools and partners",
    "group": "Explore",
    "icon": "file",
    "primary": false
  }
];

/* ShapeOS hubs for the NGO workspace, replacing the five-step list:
   Overview, Operations, Intelligence, Kaju, Training, Reports. Each entry keeps
   its own role and flag rules; only grouping, order and visibility change. */
type Hub = { section?: string; order: number; label?: string; primary?: boolean; primaryFor?: Role[]; group?: string };
/* NGO workspace areas. The sidebar shows each area once (its first page this
   role may open); the area's other pages are tabs at the top of the page, so
   every feature is one click away without a crowded sidebar. */
const NGO_HUBS: Record<string, Hub> = {
  "/ngo": { section: "Overview", order: 0, primary: true },
  "/ngo/work": { section: "Operations", order: 10, label: "Work queue", primary: true },
  "/ngo/field": { section: "Operations", order: 11, primary: true },
  "/ngo/inbox": { section: "Operations", order: 12, label: "Intake", primary: true },
  "/ngo/verification?stage=vet": { section: "Operations", order: 13, label: "Treatment & sign-off", primary: true },
  "/ngo/verification?stage=evidence": { section: "Operations", order: 14, label: "Release evidence", primary: true },
  "/ngo/animals": { section: "Records", order: 20, primary: true },
  "/ngo/map": { section: "Records", order: 21, label: "Map", primary: true },
  "/ngo/animals/scan": { section: "Records", order: 22, primary: true },
  "/ngo/care": { section: "Records", order: 23, primary: true },
  "/ngo/animals/identity": { section: "Records", order: 24, label: "Identity review", primary: true },
  "/ngo/quality": { section: "Records", order: 25, primary: true },
  "/ngo/import": { section: "Records", order: 26, primary: true },
  "/ngo/programmes": { section: "Records", order: 30, primary: true },
  "/ngo/programmes/zones": { section: "Records", order: 31, label: "Working zones", primary: true },
  "/ngo/surveys": { section: "Records", order: 32, primary: true },
  "/ngo/feeding": { section: "Records", order: 33, primary: true },
  "/ngo/projects": { section: "Records", order: 34, primary: true },
  "/ngo/packages": { section: "Reporting", order: 40, label: "Report packages", primary: true },
  "/ngo/contracts": { section: "Reporting", order: 41, primary: true },
  "/ngo/proof": { section: "Reporting", order: 42, primary: true },
  "/ngo/evidence": { section: "Reporting", order: 43, primary: true },
  "/ngo/stories": { section: "Reporting", order: 50, label: "Case stories", primary: true },
  "/ngo/fundraising": { section: "Reporting", order: 51, primary: true },
  "/ngo/volunteers": { section: "Reporting", order: 52, label: "Volunteers", primary: true, group: "Outreach" },
  "/ngo/training": { section: "Team", order: 60, primary: true, group: "Training" },
  "/ngo/team": { section: "Team", order: 70, primary: true },
  "/ngo/settings": { section: "Team", order: 71, primary: true },
  "/ngo/settings/connections": { section: "Team", order: 72, primary: true },
  "/ngo/settings/policies": { section: "Team", order: 73, primary: true },
  "/assistant": { section: "Kaju", order: 90, label: "Ask Kaju", primary: true },
};
for (const d of DESTINATIONS) {
  if (d.workspace !== "ngo" && d.href !== "/assistant") continue;
  const h = NGO_HUBS[d.query ? `${d.href}?${d.query}` : d.href];
  delete d.step;
  if (d.section === "Five steps" || (d.workspace === "ngo" && d.section === "Organisation" && d.href === "/ngo/programmes")) delete d.section;
  if (!h) continue;
  d.order = h.order;
  if (h.section) d.section = h.section;
  if (h.label) d.label = h.label;
  if (h.primary) d.primary = true;
  if (h.primaryFor) d.primaryFor = [...new Set([...(d.primaryFor ?? []), ...h.primaryFor])];
  if (h.group && d.workspace === "ngo") d.group = h.group;
  if (d.href !== "/ngo/readiness") d.listed = true;
}
/* Government: what the office runs first (overview and map), then decisions on NGO
   submissions, then reporting. Each place once. */
const CITY_HUBS: Record<string, Hub> = {
  "/city/insights": { section: "Overview", order: 0 },
  "/city": { order: 1 },
  "/city/review": { section: "Decisions", order: 10 },
  "/city/contracts": { order: 11 },
  "/city/programmes": { section: "Reporting", order: 20 },
  "/city/report": { order: 21 },
  "/city/connections": { section: "Organisation", order: 45 },
};
for (const d of DESTINATIONS) {
  if (d.workspace !== "city") continue;
  const h = CITY_HUBS[d.href];
  if (!h) continue;
  if (d.section && !h.section) delete d.section;
  d.order = h.order;
  if (h.section) d.section = h.section;
  d.primary = true;
}
/* What the sidebar calls an area when it stands for several pages. */
const AREA: Record<string, string> = { Animals: "Animals", Programmes: "Programmes", Reports: "Reports", Outreach: "Outreach", Organisation: "Organisation", Work: "Work" };
const META={
  "community": {
    "id": "community",
    "label": "Community",
    "purpose": "The map of India's street animals, your reports and what happened next",
    "ink": "#2457ce",
    "home": "/community",
    "action": {
      "href": "/community/report",
      "label": "Report an animal",
      "short": "Report"
    }
  },
  "ngo": {
    "id": "ngo",
    "label": "NGO",
    "purpose": "Implementing agencies: work queue, animal register and fieldwork",
    "ink": "#1f6f80",
    "home": "/ngo",
    "members": true,
    "settings": "/ngo/settings",
    "action": {
      "href": "/ngo/cases/new",
      "label": "New case",
      "short": "New"
    }
  },
  "city": {
    "id": "city",
    "label": "Government",
    "purpose": "Municipal oversight: wards, evidence, claims and decisions",
    "ink": "#2457ce",
    "home": "/city/insights",
    "action": null
  },
  "health": {
    "id": "health",
    "label": "Today",
    "purpose": "Programmes, hospitals, laboratories and the work between them",
    "ink": "#2457ce",
    "home": "/today",
    "action": null
  },
  "learn": {
    "id": "learn",
    "label": "Education",
    "purpose": "The StrayPaw Learning Academy: courses, workshops and resources",
    "ink": "#b65a3a",
    "home": "/learn",
    "action": null
  }
} as const;
export type Workspace={id:WorkspaceId;label:string;purpose:string;ink:string;home:string;action:{href:string;label:string;short:string}|null;members?:boolean;settings?:string;nav:NavItem[];dests:Dest[];index:IndexGroup[]};
export function canDiscover(n:NavItem,role:Role|null,reviewer=false){return (!n.roles||!!role&&n.roles.includes(role))&&(!n.reviewer||reviewer)&&(!n.flag||publicFlagOn(n.flag))}
export function destinations(ws:WorkspaceId,role:Role|null,reviewer=false){return DESTINATIONS.filter(n=>n.workspace===ws&&canDiscover(n,role,reviewer))}
export function workspaceView(ws:WorkspaceId,role:Role|null,reviewer=false):Workspace{
 const all=destinations(ws,role,reviewer),rank=(n:Destination)=>n.order??(n.href===META[ws].home?-1:50);
 let primary=all.filter(n=>n.primary||!!role&&n.primaryFor?.includes(role)).sort((a,b)=>rank(a)-rank(b));
 /* One sidebar entry per area: its first page this role may open, named for the area. Clinical keeps its two stages. */
 if(ws==="ngo"){const seen=new Set<string>();primary=primary.filter(n=>{if(n.group==="Clinical")return true;if(seen.has(n.group))return false;seen.add(n.group);return true}).map(n=>{const many=all.filter(x=>x.group===n.group).length>1;return many&&AREA[n.group]?{...n,label:AREA[n.group]}:n})}
 primary=primary.map(n=>({...n,match:[...(n.match??[]),...all.filter(x=>x.group===n.group&&x.href!==n.href&&!primary.some(p=>p.href===x.href)).map(x=>x.href)]}));
 const listed=all.filter(n=>n.listed!==false),groups=[...new Set(listed.map(n=>n.group))].map(label=>({label,links:listed.filter(n=>n.group===label)}));
 return {...META[ws],home:META[ws].home,nav:primary,index:groups,dests:primary.filter(n=>n.mobile)};
}
/** Compatibility views only: no independent route definitions. */
export const WORKSPACES=Object.fromEntries(Object.keys(META).map(ws=>[ws,workspaceView(ws as WorkspaceId,null)])) as Record<WorkspaceId,Workspace>;
export const ORDER:WorkspaceId[]=['city','ngo','community','learn'];
/** Signed-in professional workspaces; Community and Education are public products, open to anyone. */
export const PROFESSIONAL:WorkspaceId[]=['ngo','city'];
export const PUBLIC_PRODUCTS:WorkspaceId[]=['community','learn'];
/** Pages that belong to a person's places (One Health organisations and programmes). */
export const PLACE_PATH=/^\/(today|workspace|programme)(\/|$)/;
export function workspaceFor(path:string,last:WorkspaceId|null):WorkspaceId{if(PLACE_PATH.test(path))return 'health';return ORDER.find(w=>path===`/${w}`||path.startsWith(`/${w}/`))??last??'community'}
export function navOn(n:NavItem,path:string){return path===n.href||!n.exact&&path.startsWith(n.href+'/')||(n.match??[]).some(p=>path===p||path.startsWith(p+'/'))}
export function currentDestination(ws:WorkspaceId,path:string,role:Role|null,reviewer=false){return destinations(ws,role,reviewer).filter(n=>navOn(n,path)).sort((a,b)=>b.href.length-a.href.length)[0]??null}
export function currentDest(ws:Workspace,path:string){const n=currentDestination(ws.id,path,null);return n?.href??null}
export type Tab={href:string;label:string;roles?:Role[]};
export function tabsFor(path:string,role:Role|null,reviewer=false){const ws=workspaceFor(path,null),current=currentDestination(ws,path,role,reviewer);if(!current)return null;
 const tabs=destinations(ws,role,reviewer).filter(n=>n.group===current.group&&n.href!='/assistant'&&(n.listed!==false||n.href===current.href)).sort((a,b)=>(a.order??50)-(b.order??50)).filter((n,i,all)=>all.findIndex(x=>x.href===n.href)===i);return tabs.length>1?{tabs,on:current.href}:null}
const KEY='sp2.workspace';
export function rememberWorkspace(id:WorkspaceId){try{sessionStorage.setItem(KEY,id)}catch{}}
export function lastWorkspace():WorkspaceId|null{try{const v=sessionStorage.getItem(KEY);return v&&v in META?v as WorkspaceId:null}catch{return null}}

/* ── The designed sidebar ──────────────────────────────────────────────
   The same pattern for every place (see placeNav in src/oh/places.tsx):
   Today first; then Work, at most four things this person does every day,
   chosen by role; then Programme when the organisation takes part in one;
   everything else under More. Nothing is deleted, only placed where it is
   used: secondary pages stay one tap away in More, section tabs and ⌘K. */
const N=(href:string,label:string,icon:string,extra:Partial<NavItem>={}):NavItem=>({href,label,icon,...extra});
export function designedNav(ws:WorkspaceId,role:Role|null,reviewer=false):NavItem[]|null{
 const on=(n:NavItem)=>canDiscover(n,role,reviewer);
 const W='Work';
 if(ws==='ngo'){
  const animals=N('/ngo/animals','Animals','paw',{section:W,short:'Animals',match:['/ngo/map','/ngo/care','/ngo/quality','/ngo/import','/ngo/review']});
  const treat=N('/ngo/verification','Treatment & release','shield',{section:W,short:'Treat',match:[]});
  const field=N('/ngo/field','Field mode','phone',{section:W,short:'Field'});
  const queue=N('/ngo/work','Work queue','list',{section:W,short:'Queue',match:['/ngo/cases']});
  const intake=N('/ngo/inbox','Intake','inbox',{section:W,short:'Intake'});
  const reports=N('/ngo/packages','Reports','file',{section:W,short:'Reports',match:['/ngo/proof','/ngo/evidence','/ngo/contracts']});
  const work=role==='member'?[field,queue,animals]:role==='veterinarian'?[treat,animals,queue]:[queue,intake,treat,role==='admin'||role==='coordinator'?reports:animals];
  return [N('/ngo','Today','home',{exact:true,short:'Today'}),...work].filter(on);
 }
 if(ws==='city'){
  return [
   N('/city/insights','Today','home',{short:'Today'}),
   N('/city','Wards & map','map',{exact:true,section:W,short:'Map'}),
   N('/city/review','Review submissions','check',{section:W,short:'Review',reviewer:true}),
   N('/city/contracts','Contracts & rates','file',{section:W,short:'Contracts',reviewer:true}),
  ].filter(on);
 }
 return null;
}
