/** Canonical destinations. Every navigation surface is derived from this registry.
 * Visibility is fail-closed for restricted destinations; RLS remains authoritative. */
export type WorkspaceId='community'|'ngo'|'city'|'learn';
export type Role='admin'|'coordinator'|'veterinarian'|'member';
import { publicFlagOn, type Flag } from '@/lib/flags';
export type NavItem={href:string;label:string;icon:string;/** Shown only when this feature flag is on. */flag?:Flag;aliases?:string[];match?:string[];exact?:boolean;short?:string;tone?:string;section?:string;roles?:Role[];reviewer?:boolean;hrefFor?:Partial<Record<Role,string>>;/** Position in the five-step NGO workflow. */step?:number;/** Query string that selects a view of the page (e.g. stage=vet). */query?:string;order?:number};
export type Destination=NavItem & {workspace:WorkspaceId;group:string;primary:boolean;mobile?:boolean;primaryFor?:Role[];assistantKey?:string;note?:string;/** false: reached from its hub page and search, not listed in the sidebar. */listed?:boolean};
export type Dest=NavItem & {short?:string};
export type IndexGroup={label:string;links:Destination[]};
export const DESTINATIONS:Destination[]=[
 {workspace:'ngo',href:'/ngo/training',label:'Training',icon:'grad',group:'Organisation',primary:false,note:'Courses, assignments and progress',flag:'training_lms'},
 {workspace:'ngo',href:'/ngo/animals/scan',label:'Scan to find',icon:'paw',group:'Animals',primary:false,note:'Microchip, RFID or QR',flag:'animal_identifiers'},
 {workspace:'ngo',href:'/ngo/readiness',label:'Readiness',icon:'list',group:'Organisation',primary:false,roles:['admin','coordinator'],flag:'readiness_board'},
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
    "home": "/city",
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
 const all=destinations(ws,role,reviewer),rank=(n:Destination)=>n.order??(n.href===META[ws].home?-1:50),primary=all.filter(n=>n.primary||!!role&&n.primaryFor?.includes(role)).sort((a,b)=>rank(a)-rank(b)).map(n=>({...n,match:[...(n.match??[]),...all.filter(x=>x.group===n.group&&x.href!==n.href&&!(x.primary||!!role&&x.primaryFor?.includes(role))).map(x=>x.href)]}));
 const listed=all.filter(n=>n.listed!==false),groups=[...new Set(listed.map(n=>n.group))].map(label=>({label,links:listed.filter(n=>n.group===label)}));
 return {...META[ws],home:ws==='city'&&reviewer?'/city/review':META[ws].home,nav:primary,index:groups,dests:primary.filter(n=>n.mobile)};
}
/** Compatibility views only: no independent route definitions. */
export const WORKSPACES=Object.fromEntries(Object.keys(META).map(ws=>[ws,workspaceView(ws as WorkspaceId,null)])) as Record<WorkspaceId,Workspace>;
export const ORDER:WorkspaceId[]=['city','ngo','community','learn'];
/** Signed-in professional workspaces; Community and Education are public products, open to anyone. */
export const PROFESSIONAL:WorkspaceId[]=['ngo','city'];
export const PUBLIC_PRODUCTS:WorkspaceId[]=['community','learn'];
export function workspaceFor(path:string,last:WorkspaceId|null):WorkspaceId{return ORDER.find(w=>path===`/${w}`||path.startsWith(`/${w}/`))??last??'community'}
export function navOn(n:NavItem,path:string){return path===n.href||!n.exact&&path.startsWith(n.href+'/')||(n.match??[]).some(p=>path===p||path.startsWith(p+'/'))}
export function currentDestination(ws:WorkspaceId,path:string,role:Role|null,reviewer=false){return destinations(ws,role,reviewer).filter(n=>navOn(n,path)).sort((a,b)=>b.href.length-a.href.length)[0]??null}
export function currentDest(ws:Workspace,path:string){const n=currentDestination(ws.id,path,null);return n?.href??null}
export type Tab={href:string;label:string;roles?:Role[]};
export function tabsFor(path:string,role:Role|null,reviewer=false){const ws=workspaceFor(path,null),current=currentDestination(ws,path,role,reviewer);if(!current)return null;
 const tabs=destinations(ws,role,reviewer).filter(n=>n.group===current.group&&n.href!='/assistant'&&(n.listed!==false||n.href===current.href)).sort((a,b)=>Number(b.primary)-Number(a.primary)).filter((n,i,all)=>all.findIndex(x=>x.href===n.href)===i);return tabs.length>1?{tabs,on:current.href}:null}
const KEY='sp2.workspace';
export function rememberWorkspace(id:WorkspaceId){try{sessionStorage.setItem(KEY,id)}catch{}}
export function lastWorkspace():WorkspaceId|null{try{const v=sessionStorage.getItem(KEY);return v&&v in META?v as WorkspaceId:null}catch{return null}}
