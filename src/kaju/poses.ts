/** Kaju companion rig. The original controller and joint API are retained.
 * The 4 November owner reference replaces the Explorer puppy anatomy. */
export const EVERYDAY=["sitting","lying","standing","walking","trotting","sleeping","waking","stretching","peeking","looking","headTilt","earTwitch","tailWag","settling","bored"] as const;
export const ASSISTANT=["greeting","listening","thinking","working","happy","confused","explaining","success","insight","concerned","error","goodbye"] as const;
export type KajuState=(typeof EVERYDAY)[number]|(typeof ASSISTANT)[number];
export const ALL_STATES:KajuState[]=[...EVERYDAY,...ASSISTANT];
/** f = shoulder/hand; b = ankle/foot. tail remains a hidden compatibility joint. */
export type Part="torso"|"head"|"tail"|"bFar"|"bNear"|"fFar"|"fNear";
export type T={x:number;y:number;r?:number;sx?:number;sy?:number;hide?:boolean};
export type Eyes="open"|"closed"|"happy"|"up"|"half"|"wide";
export type Mouth="smile"|"open"|"flat";
export type Ears="up"|"relaxed"|"back";
export type Loop="walk"|"trot"|"wag"|"wagSlow"|"breathe"|"blink"|"look"|"twitch"|"hop"|"wave"|"explain"|"think"|"zz"|"sparkle"|"stretch"|"wake"|"type"|"sigh"|"puzzle";
export type Pose={parts:Record<Part,T>;eyes:Eyes;mouth:Mouth;ears:Ears;brows?:boolean;loops:Loop[];shadow?:number;label:string};
const STAND:Record<Part,T>={torso:{x:120,y:136},head:{x:120,y:78},tail:{x:120,y:150,hide:true},bFar:{x:103,y:173},bNear:{x:139,y:173},fFar:{x:84,y:110,r:5},fNear:{x:156,y:110,r:-5}};
const w=(base:Record<Part,T>,over:Partial<Record<Part,Partial<T>>>):Record<Part,T>=>Object.fromEntries((Object.keys(base)as Part[]).map(k=>[k,{...base[k],...over[k]}]))as Record<Part,T>;
const SIT=w(STAND,{torso:{y:141,r:1},head:{y:84,r:-2},bFar:{x:100,y:174,r:-8},bNear:{x:142,y:174,r:8},fFar:{x:86,y:118,r:-12},fNear:{x:155,y:119,r:12}});
const LIE=w(STAND,{torso:{x:135,y:147,r:-65},head:{x:85,y:137,r:-65},bFar:{x:162,y:153,r:-68},bNear:{x:172,y:169,r:-60},fFar:{x:107,y:163,r:65},fNear:{x:115,y:166,r:-75}});
const pose=(parts:Record<Part,T>,eyes:Eyes="open",mouth:Mouth="smile",loops:Loop[]=["breathe","blink"],label="resting",ears:Ears="relaxed"):Pose=>({parts,eyes,mouth,loops,label,ears});
export const POSES:Record<KajuState,Pose>={
 sitting:pose(SIT,"open","smile",["breathe","blink"],"sitting"),
 standing:pose(STAND,"open","smile",["breathe","blink"],"standing"),
 walking:pose(STAND,"open","smile",["walk","blink"],"walking"),
 trotting:pose(STAND,"happy","smile",["trot","blink"],"trotting"),
 lying:{...pose(LIE,"open","smile",["breathe","blink"],"resting"),shadow:1.22},
 sleeping:{...pose(w(LIE,{head:{y:144,r:-70},fNear:{r:-76}}),"closed","smile",["breathe","zz"],"sleeping"),shadow:1.22},
 waking:pose(w(LIE,{head:{y:131,r:-48}}),"half","open",["wake","blink"],"waking up"),
 stretching:pose(w(STAND,{head:{y:75,r:4},fFar:{x:85,y:105,r:127},fNear:{x:155,y:105,r:-127}}),"closed","open",["stretch"],"stretching"),
 peeking:pose(w(SIT,{torso:{hide:true},head:{y:163},bFar:{hide:true},bNear:{hide:true},fFar:{x:85,y:177,r:0,sy:.4},fNear:{x:164,y:177,r:0,sy:.4}}),"wide","smile",["blink","twitch"],"peeking"),
 looking:pose(SIT,"open","smile",["look","blink","breathe"],"looking around"),
 headTilt:pose(w(SIT,{head:{r:-13}}),"wide","smile",["blink","breathe"],"tilting his head"),
 earTwitch:pose(SIT,"open","smile",["twitch","blink","breathe"],"twitching his ears"),
 tailWag:pose(STAND,"happy","smile",["wag","breathe"],"playfully swaying"),
 settling:pose(w(LIE,{head:{r:-58}}),"half","smile",["breathe"],"settling down"),
 bored:pose(w(SIT,{head:{y:88,r:7},torso:{r:3},fFar:{r:-5},fNear:{r:8}}),"half","flat",["sigh","blink"],"waiting patiently"),
 greeting:pose(w(STAND,{head:{r:-5},fNear:{x:156,y:110,r:-100}}),"happy","smile",["wave","breathe","twitch"],"waving hello"),
 goodbye:pose(w(SIT,{head:{r:-4},fNear:{x:156,y:114,r:-100}}),"happy","smile",["wave","breathe"],"waving goodbye"),
 listening:pose(w(SIT,{head:{r:-5}}),"open","smile",["blink","twitch","breathe"],"listening"),
 thinking:pose(w(SIT,{head:{r:-9},fNear:{x:155,y:137,r:-155,sx:.76,sy:.76}}),"up","flat",["think","blink","breathe"],"thinking"),
 working:pose(w(SIT,{head:{y:87,r:3},fFar:{x:85,y:118,r:-48},fNear:{x:155,y:118,r:48}}),"open","smile",["type","blink","breathe"],"working on his laptop"),
 happy:pose(w(STAND,{fFar:{r:18},fNear:{r:-18},head:{r:-4}}),"happy","open",["wag","breathe","blink"],"happy"),
 confused:pose(w(SIT,{head:{r:11},fFar:{r:28},fNear:{r:-28}}),"wide","flat",["puzzle","blink","breathe"],"looking for clarification"),
 explaining:pose(w(SIT,{fNear:{x:155,y:116,r:-75}}),"open","open",["explain","blink","breathe"],"explaining"),
 success:pose(w(STAND,{fFar:{r:15},fNear:{r:-18}}),"happy","open",["hop","breathe"],"pleased with the verified result"),
 insight:pose(w(SIT,{head:{r:-4},fNear:{r:-62}}),"wide","smile",["sparkle","blink","breathe"],"noticing something"),
 concerned:{...pose(w(SIT,{head:{r:7}}),"wide","flat",["blink","breathe"],"concerned"),brows:true},
 error:{...pose(w(SIT,{head:{r:9}}),"wide","flat",["blink","breathe"],"unable to finish"),brows:true},
};
export const MOTION_LOOPS:Loop[]=["walk","trot","wag","wagSlow","breathe","blink","look","twitch","hop","wave","explain","think","zz","sparkle","stretch","wake","type","sigh","puzzle"];
export type Step={state:KajuState;ms:number};
export const SEQUENCES:Record<string,Step[]>={
 wakeUp:[{state:"sleeping",ms:2200},{state:"waking",ms:1100},{state:"stretching",ms:1300},{state:"standing",ms:600},{state:"happy",ms:1400},{state:"sitting",ms:0}],
 arrive:[{state:"trotting",ms:1800},{state:"standing",ms:400},{state:"greeting",ms:1600},{state:"sitting",ms:0}],
 idle:[{state:"sitting",ms:7000},{state:"looking",ms:3200},{state:"sitting",ms:6000},{state:"bored",ms:3200},{state:"earTwitch",ms:1600},{state:"settling",ms:900},{state:"sleeping",ms:0}],
 chill:[{state:"lying",ms:14000},{state:"sleeping",ms:16000},{state:"waking",ms:1100},{state:"sitting",ms:5000}],
 perch:[{state:"sitting",ms:6000},{state:"looking",ms:3200},{state:"bored",ms:2600},{state:"sitting",ms:5000},{state:"headTilt",ms:1600},{state:"sitting",ms:6000},{state:"happy",ms:1400}],
 hello:[{state:"greeting",ms:2200},{state:"listening",ms:4000},{state:"looking",ms:2200},{state:"greeting",ms:1700},{state:"sitting",ms:10000}],
 desk:[{state:"working",ms:7000},{state:"thinking",ms:2600},{state:"working",ms:7000},{state:"happy",ms:1600},{state:"sitting",ms:5000}],
 open:[{state:"greeting",ms:1600},{state:"listening",ms:0}],
 close:[{state:"goodbye",ms:1100},{state:"settling",ms:900},{state:"lying",ms:0}],
 done:[{state:"success",ms:1500},{state:"sitting",ms:0}],
 fullDemo:[{state:"greeting",ms:1800},{state:"working",ms:4000},{state:"thinking",ms:2200},{state:"confused",ms:1800},{state:"happy",ms:1600},{state:"bored",ms:2500},{state:"sleeping",ms:0}],
};
