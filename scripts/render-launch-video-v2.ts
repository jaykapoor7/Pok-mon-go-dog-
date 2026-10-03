import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const ROOT = process.cwd();
const OUT = resolve(ROOT, "launch-video-v2");
const ASSETS = resolve(OUT, "assets");
const RAW = resolve(OUT, "raw-film.webm");
const WAV = resolve(OUT, "soundtrack.wav");
const FINAL = resolve(OUT, "straypaw-launch-v2.mp4");
const FPS = 30;
const DURATION = 45;
let server: ChildProcess | undefined;

const STOCK = {
  street: {
    url: "https://videos.pexels.com/video-files/33515265/14253993_1920_1080_30fps.mp4",
    page: "https://www.pexels.com/video/stray-dogs-roaming-city-streets-in-rain-33515265/",
    creator: "Swapnil Shiwalay"
  },
  vet: {
    url: "https://videos.pexels.com/video-files/4186960/4186960-hd_1920_1080_25fps.mp4",
    page: "https://www.pexels.com/video/perro-veterinario-4186960/",
    creator: "CESAR CASANOVA"
  }
};

function run(cmd: string, args: string[]) {
  return new Promise<void>((ok, fail) => {
    const p = spawn(cmd, args, { stdio: "inherit" });
    p.on("error", fail);
    p.on("exit", (code) => code === 0 ? ok() : fail(new Error(cmd + " exited with " + code)));
  });
}

async function download(url: string, target: string) {
  await run("curl", ["-L", "--fail", "--retry", "3", "--retry-delay", "2", "-A", "Mozilla/5.0", "-o", target, url]);
}

function clamp(x: number, a = 0, b = 1) { return Math.max(a, Math.min(b, x)); }
function smooth(x: number) { x = clamp(x); return x * x * (3 - 2 * x); }

async function makeAudio(path: string) {
  const sr = 48000;
  const n = sr * DURATION;
  const pcm = Buffer.alloc(n * 4);
  let seed = 7331;
  const noise = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 4294967296) * 2 - 1;
  };
  const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
  const chords = [
    [48, 55, 60, 64],
    [45, 52, 57, 60],
    [41, 48, 53, 57],
    [43, 50, 55, 59]
  ];
  const kick = (t: number, at: number, amp: number) => {
    const d = t - at;
    if (d < 0 || d > .24) return 0;
    return Math.sin(2 * Math.PI * (72 - 42 * d) * d) * Math.exp(-17 * d) * amp;
  };
  const ping = (t: number, at: number, f: number, amp: number, len = .22) => {
    const d = t - at;
    if (d < 0 || d > len) return 0;
    return Math.sin(2 * Math.PI * f * d) * Math.exp(-13 * d) * amp;
  };
  const beat = 60 / 96;

  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let v = 0;
    const intro = smooth(t / 3.5);
    const outro = smooth((DURATION - t) / 2.2);
    const muteDrop = (t > 13.15 && t < 14.75) ? 0.055 : 1;
    const ci = Math.floor(t / (beat * 8)) % chords.length;
    const chord = chords[ci];
    for (let k = 0; k < chord.length; k++) {
      const f = midi(chord[k]);
      const phase = 2 * Math.PI * f * t;
      v += Math.sin(phase) * (k === 0 ? .037 : .024);
      v += Math.sin(phase * .5) * .007;
    }
    v *= intro * outro * muteDrop;

    if (t > 14.75 && t < 42.2) {
      const beatIndex = Math.floor((t - 14.75) / beat);
      const at = 14.75 + beatIndex * beat;
      v += kick(t, at, .24);
      if (beatIndex % 2 === 1) {
        const d = t - at;
        if (d >= 0 && d < .08) v += noise() * Math.exp(-42 * d) * .065;
      }
      const eighth = beat / 2;
      const ei = Math.floor((t - 14.75) / eighth);
      const ea = 14.75 + ei * eighth;
      v += ping(t, ea, midi([72, 76, 79, 83][ei % 4]), .035, .13);
    }

    // camera shutter: tactile click + short mechanical noise
    {
      const d = t - 8.55;
      if (d >= 0 && d < .13) {
        v += noise() * Math.exp(-34 * d) * .28;
        v += Math.sin(2 * Math.PI * 1850 * d) * Math.exp(-52 * d) * .16;
      }
      const d2 = t - 8.64;
      if (d2 >= 0 && d2 < .09) v += noise() * Math.exp(-46 * d2) * .16;
    }

    // send + NGO workflow clicks
    for (const at of [11.92, 17.65, 19.75, 21.86, 23.97, 28.45, 30.15, 31.85, 33.55]) {
      v += ping(t, at, 920, .075, .075) + ping(t, at + .025, 1380, .03, .05);
    }

    // warm completion chime
    v += ping(t, 24.55, midi(76), .11, .55) + ping(t, 24.66, midi(83), .08, .65);

    // final two-note sonic mark
    v += ping(t, 42.25, midi(72), .14, 1.05);
    v += ping(t, 42.82, midi(79), .16, 1.35);

    v = Math.tanh(v * 1.35) * .78;
    const s = Math.max(-32767, Math.min(32767, Math.round(v * 32767)));
    pcm.writeInt16LE(s, i * 4);
    pcm.writeInt16LE(s, i * 4 + 2);
  }

  const hdr = Buffer.alloc(44);
  hdr.write("RIFF", 0);
  hdr.writeUInt32LE(36 + pcm.length, 4);
  hdr.write("WAVE", 8);
  hdr.write("fmt ", 12);
  hdr.writeUInt32LE(16, 16);
  hdr.writeUInt16LE(1, 20);
  hdr.writeUInt16LE(2, 22);
  hdr.writeUInt32LE(sr, 24);
  hdr.writeUInt32LE(sr * 4, 28);
  hdr.writeUInt16LE(4, 32);
  hdr.writeUInt16LE(16, 34);
  hdr.write("data", 36);
  hdr.writeUInt32LE(pcm.length, 40);
  await writeFile(path, Buffer.concat([hdr, pcm]));
}

function filmHtml() {
  return String.raw`<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face{font-family:Inter;src:local("Arial")}
:root{--ink:#0b1e3d;--shell:#f3ede4;--flame:#f05b40;--blue:#2457ce;--white:#fff;--soft:#e8e0d5;--muted:#667084}
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:var(--ink);font-family:Inter,Arial,sans-serif}
#film{position:relative;width:1080px;height:1920px;overflow:hidden;background:var(--shell);isolation:isolate}
.scene{position:absolute;inset:0;opacity:0;pointer-events:none;will-change:opacity,transform}
.video{position:absolute;inset:-3%;width:106%;height:106%;object-fit:cover;filter:saturate(.88) contrast(1.03);will-change:transform}
.vignette{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,15,32,.20),rgba(5,15,32,.05) 38%,rgba(5,15,32,.76))}
.brand{position:absolute;top:68px;left:64px;display:flex;gap:14px;align-items:center;color:#fff;font-size:27px;font-weight:800;letter-spacing:-.02em}
.brand.dark{color:var(--ink)} .paw{width:38px;height:38px;border-radius:12px;background:var(--flame);display:grid;place-items:center;font-size:20px}
.copy{position:absolute;left:68px;right:68px;bottom:124px;color:#fff}.eyebrow{font-size:18px;letter-spacing:.15em;text-transform:uppercase;font-weight:800;opacity:.78;margin-bottom:22px}.h1{font-family:Georgia,serif;font-size:92px;line-height:.96;letter-spacing:-.045em;font-weight:400}.sub{font-size:29px;line-height:1.32;margin-top:28px;max-width:850px;opacity:.88}
.shell{background:var(--shell);color:var(--ink)}.ink{background:var(--ink);color:#fff}
.topcopy{position:absolute;left:66px;right:66px;top:122px}.kicker{font-size:17px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:var(--blue);margin-bottom:18px}.title{font-family:Georgia,serif;font-size:73px;line-height:1.0;letter-spacing:-.04em}.lede{font-size:25px;line-height:1.35;color:var(--muted);margin-top:18px;max-width:900px}
.photoCard{position:absolute;left:62px;top:365px;width:956px;height:720px;border-radius:46px;overflow:hidden;background:#d9d0c4;box-shadow:0 26px 70px rgba(11,30,61,.14);border:1px solid rgba(11,30,61,.10)}
.photoCard img{width:100%;height:100%;object-fit:cover;transform-origin:center;will-change:transform}.photoTag{position:absolute;left:28px;bottom:26px;padding:14px 19px;border-radius:999px;background:rgba(11,30,61,.82);backdrop-filter:blur(9px);color:#fff;font-size:18px;font-weight:750;letter-spacing:.04em}
.reportPanel{position:absolute;left:78px;top:1110px;width:924px;height:620px;border-radius:42px;overflow:hidden;background:#fff;box-shadow:0 24px 70px rgba(11,30,61,.17);border:1px solid rgba(11,30,61,.08)}
.reportPanel img,.screen img{width:100%;height:100%;object-fit:cover;will-change:transform}
.shutter{position:absolute;left:50%;top:720px;width:170px;height:170px;margin:-85px;border:5px solid rgba(255,255,255,.92);border-radius:50%;box-shadow:0 0 0 999px rgba(0,0,0,.05)}
.flash{position:absolute;inset:0;background:#fff;opacity:0;z-index:80}
.chips{position:absolute;left:86px;right:86px;top:1470px;display:flex;gap:10px;flex-wrap:wrap;z-index:10}
.chip{background:#fff;border:1px solid rgba(11,30,61,.11);box-shadow:0 8px 28px rgba(11,30,61,.08);border-radius:999px;padding:13px 17px;font-size:17px;font-weight:760;color:var(--ink);opacity:0;transform:translateY(20px)}
.send{position:absolute;left:116px;right:116px;bottom:82px;height:76px;border-radius:25px;background:var(--blue);color:#fff;display:grid;place-items:center;font-size:21px;font-weight:850;letter-spacing:.01em;box-shadow:0 15px 38px rgba(36,87,206,.25);transform:scale(1)}
.record{position:absolute;left:132px;right:132px;bottom:72px;height:112px;border-radius:30px;background:#fff;box-shadow:0 20px 65px rgba(11,30,61,.18);display:flex;align-items:center;gap:17px;padding:18px 22px;opacity:0}
.record img{width:72px;height:72px;border-radius:20px;object-fit:cover}.record b{font-size:20px}.record span{font-size:15px;color:var(--muted);display:block;margin-top:4px}.ok{margin-left:auto;width:38px;height:38px;border-radius:50%;background:#daf3e4;color:#14783e;display:grid;place-items:center;font-weight:900}
.until{position:absolute;inset:0;display:grid;place-items:center;text-align:center}.until .small{font-size:18px;letter-spacing:.16em;text-transform:uppercase;opacity:.62;margin-bottom:22px}.until .big{font-family:Georgia,serif;font-size:130px;letter-spacing:-.05em}.until .line{width:90px;height:7px;border-radius:99px;background:var(--flame);margin:34px auto 0}
.screen{position:absolute;left:56px;top:355px;width:968px;height:1080px;border-radius:46px;overflow:hidden;background:#fff;border:1px solid rgba(11,30,61,.09);box-shadow:0 24px 75px rgba(11,30,61,.15)}
.browserbar{position:absolute;left:56px;top:318px;width:968px;height:74px;background:#fff;border-radius:38px 38px 0 0;z-index:5;border:1px solid rgba(11,30,61,.08);display:flex;align-items:center;padding:0 22px;gap:10px}.dot{width:11px;height:11px;border-radius:50%;background:#d8d8d8}.url{margin-left:12px;font-size:14px;color:#7a8495;background:#f4f3ef;border-radius:18px;padding:9px 18px;flex:1}
.flow{position:absolute;left:64px;right:64px;bottom:95px;display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.step{border-radius:22px;background:#e8e3da;color:#7a8495;min-height:92px;padding:15px 12px;text-align:center;font-size:15px;font-weight:850;display:grid;place-items:center;transition:.2s}.step.on{background:var(--ink);color:#fff;box-shadow:0 12px 26px rgba(11,30,61,.16)}
.miniRecord{position:absolute;width:430px;height:112px;border-radius:28px;background:#fff;box-shadow:0 18px 50px rgba(11,30,61,.2);display:flex;align-items:center;gap:15px;padding:16px;z-index:15}.miniRecord img{width:77px;height:77px;border-radius:21px;object-fit:cover}.miniRecord b{font-size:18px}.miniRecord small{font-size:14px;color:var(--muted)}
.vet{position:absolute;right:56px;top:1040px;width:418px;height:525px;border-radius:36px;overflow:hidden;border:8px solid var(--shell);box-shadow:0 26px 66px rgba(11,30,61,.20);z-index:12;opacity:0}.vet video{width:100%;height:100%;object-fit:cover}.vetLabel{position:absolute;left:16px;bottom:16px;color:#fff;background:rgba(11,30,61,.78);padding:10px 13px;border-radius:14px;font-size:13px;font-weight:800}
.mapScreen{position:absolute;left:56px;right:56px;top:360px;height:1260px;border-radius:48px;overflow:hidden;background:#dbe1e7;box-shadow:0 24px 74px rgba(11,30,61,.15);border:1px solid rgba(11,30,61,.08)}.mapScreen img{position:absolute;width:100%;height:100%;object-fit:cover;transition:none;will-change:opacity,transform}
.pin{position:absolute;left:522px;top:930px;width:36px;height:36px;border-radius:50%;background:var(--flame);border:7px solid #fff;box-shadow:0 0 0 0 rgba(240,91,64,.4);z-index:8}.pin:after{content:"";position:absolute;inset:-22px;border:2px solid var(--flame);border-radius:50%;opacity:.45}
.counters{position:absolute;left:64px;right:64px;bottom:72px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.counter{background:#fff;border-radius:25px;padding:18px 10px;text-align:center;border:1px solid rgba(11,30,61,.08)}.counter b{font-family:Georgia,serif;font-size:42px}.counter span{display:block;font-size:12px;letter-spacing:.11em;color:var(--muted);margin-top:4px;font-weight:850}
.roles{position:absolute;left:80px;right:80px;bottom:228px;display:flex;justify-content:center;gap:12px}.role{padding:13px 18px;border-radius:999px;background:rgba(11,30,61,.88);color:#fff;font-size:15px;font-weight:780}
.visionText{position:absolute;left:68px;right:68px;bottom:120px;color:#fff}.visionText .title{font-size:73px}.visionText p{font-size:26px;line-height:1.38;max-width:870px}
.end{display:flex;align-items:flex-start;justify-content:center;flex-direction:column;padding:0 78px;background:var(--shell)}.end .mark{width:76px;height:76px;border-radius:25px;background:var(--flame);display:grid;place-items:center;color:#fff;font-size:38px;margin-bottom:40px}.end h1{font-family:Georgia,serif;color:var(--ink);font-weight:400;font-size:97px;line-height:.96;letter-spacing:-.05em;margin:0}.end h1 em{color:var(--flame);font-style:normal}.end .site{font-size:24px;color:var(--blue);font-weight:850;margin-top:48px;letter-spacing:.02em}.end .tiny{position:absolute;left:80px;bottom:72px;font-size:14px;color:#7a8495;letter-spacing:.08em}
</style></head>
<body><main id="film">
<section id="s1" class="scene">
  <video id="street1" class="video" muted playsinline loop src="/launch-video-v2/assets/street.mp4"></video><div class="vignette"></div>
  <div class="brand"><span class="paw">•</span><span>StrayPaw</span></div>
  <div class="copy" id="introCopy"><div class="eyebrow">THE MOMENT CARE STARTS</div><div class="h1">A street dog<br>gets seen.</div><div class="sub">That moment should be enough to start a record — and a response.</div></div>
</section>

<section id="s2" class="scene shell">
  <div class="brand dark"><span class="paw">•</span><span>StrayPaw</span></div>
  <div class="topcopy"><div class="kicker">REPORT IN SECONDS</div><div class="title">A photo. A place.<br>What you can see.</div></div>
  <div class="photoCard" id="pinkyCard"><img id="pinky" src="/public/pinky-bengaluru.jpg"><div class="photoTag">PINKY · BENGALURU</div><div class="shutter" id="shutter"></div></div>
  <div class="reportPanel" id="reportPanel"><img src="/launch-video-v2/stills/02-report.png"></div>
  <div class="chips"><div class="chip" id="chip1">PHOTO ATTACHED</div><div class="chip" id="chip2">📍 BENGALURU</div><div class="chip" id="chip3">CONDITION ADDED</div></div>
  <div class="send" id="send">SEND REPORT</div>
  <div class="record" id="record"><img src="/public/pinky-bengaluru.jpg"><div><b>Pinky is now on the record.</b><span>Photo · place · condition · one animal ID</span></div><div class="ok">✓</div></div>
</section>

<section id="s2b" class="scene ink"><div class="until"><div><div class="small">THE HANDOFF USED TO BREAK HERE</div><div class="big">Until now.</div><div class="line"></div></div></div></section>

<section id="s3" class="scene shell">
  <div class="brand dark"><span class="paw">•</span><span>StrayPaw</span></div>
  <div class="topcopy"><div class="kicker">NGO WORKSPACE</div><div class="title">One report becomes work.</div><div class="lede">The same animal record moves from intake to outcome.</div></div>
  <div class="browserbar"><i class="dot"></i><i class="dot"></i><i class="dot"></i><span class="url">straypaw.org · NGO workspace</span></div>
  <div class="screen"><img id="queueImg" src="/launch-video-v2/stills/04-case-queue.png"><img id="detailImg" src="/launch-video-v2/stills/05-case-detail.png" style="position:absolute;inset:0;opacity:0"></div>
  <div class="miniRecord" id="mini"><img src="/public/pinky-bengaluru.jpg"><div><b>Pinky · new case</b><small>from community report</small></div></div>
  <div class="vet" id="vetCard"><video id="vetVideo" muted playsinline loop src="/launch-video-v2/assets/vet.mp4"></video><div class="vetLabel">CARE HAPPENS IN THE REAL WORLD</div></div>
  <div class="flow"><div class="step" id="st1">CLAIMED</div><div class="step" id="st2">ASSIGNED</div><div class="step" id="st3">CARE LOGGED</div><div class="step" id="st4">RESOLVED</div></div>
</section>

<section id="s4" class="scene shell">
  <div class="brand dark"><span class="paw">•</span><span>StrayPaw</span></div>
  <div class="topcopy"><div class="kicker">THE MAP PIPELINE</div><div class="title">Then the record becomes<br>a point the city can see.</div></div>
  <div class="mapScreen"><img id="mapA" src="/launch-video-v2/stills/03-map.png"><img id="mapB" src="/launch-video-v2/stills/06-coverage.png" style="opacity:0"></div>
  <div class="pin" id="pin"></div>
  <div class="roles"><span class="role">RESIDENT</span><span class="role">NGO</span><span class="role">MUNICIPALITY</span></div>
  <div class="counters"><div class="counter"><b id="c1">0</b><span>REPORT</span></div><div class="counter"><b id="c2">0</b><span>ANIMAL RECORD</span></div><div class="counter"><b id="c3">0</b><span>SHARED VIEWS</span></div></div>
</section>

<section id="s5" class="scene">
  <video id="street2" class="video" muted playsinline loop src="/launch-video-v2/assets/street.mp4"></video><div class="vignette"></div>
  <div class="brand"><span class="paw">•</span><span>StrayPaw</span></div>
  <div class="visionText"><div class="eyebrow">ONE SHARED RECORD</div><div class="title">Residents see what happened.<br>NGOs run the work.<br>Cities see the gaps.</div><p>From the first sighting to the outcome, the record stays with the animal.</p></div>
</section>

<section id="s6" class="scene end">
  <div class="mark">•</div><h1>Every street animal.<br><em>Seen. Tracked. Cared for.</em></h1><div class="site">straypaw.org</div><div class="tiny">STRAYPAW · ONE REPORT → ONE RECORD → ONE NETWORK</div>
</section>
<div class="flash" id="flash"></div>
</main>
<script>
const D=45;
const E=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
const fade=(t,a,b,f=.55)=>Math.min(E((t-a)/f),E((b-t)/f));
const S=id=>document.getElementById(id);
const scenes=[["s1",0,6.2],["s2",5.65,13.45],["s2b",12.9,15.25],["s3",14.75,26.75],["s4",26.1,36.25],["s5",35.65,42.15],["s6",41.55,45.1]];
let started=false,t0=0,street2Started=false,vetStarted=false;
function setOp(id,o){S(id).style.opacity=String(Math.max(0,Math.min(1,o)))}
function render(t){
  for(const [id,a,b] of scenes) setOp(id,fade(t,a,b));
  // street opener: very slow camera drift
  S("street1").style.transform="scale("+(1.08+.018*E(t/6))+") translateY("+(-10*E(t/6))+"px)";
  S("introCopy").style.transform="translateY("+(30*(1-E((t-.3)/1.1)))+"px)";
  // Pinky is the actual animal carried through the story
  const p=E((t-5.9)/5.6); S("pinky").style.transform="scale("+(1.02+.07*p)+") translateY("+(-22*p)+"px)";
  S("reportPanel").style.transform="translateY("+(36*(1-E((t-6.7)/1.0)))+"px)";
  for(let i=1;i<=3;i++){const o=E((t-(8.85+i*.55))/.42);setOp("chip"+i,o);S("chip"+i).style.transform="translateY("+(18*(1-o))+"px)"}
  const press=Math.max(0,1-Math.abs(t-11.92)/.16); S("send").style.transform="scale("+(1-.035*press)+")";
  const ro=E((t-12.15)/.38);setOp("record",ro);S("record").style.transform="translateY("+(18*(1-ro))+"px)";
  const f=Math.max(0,1-Math.abs(t-8.55)/.10);S("flash").style.opacity=String(f*.92);S("shutter").style.transform="scale("+(1+.14*f)+")";
  // NGO: Pinky record visibly travels into queue, then detail.
  const m=E((t-15.5)/2.1); S("mini").style.left=(320*(1-m)+570*m)+"px";S("mini").style.top=(1420*(1-m)+485*m)+"px";S("mini").style.transform="scale("+(1-.28*m)+")";
  const detail=E((t-19.1)/.85);S("detailImg").style.opacity=String(detail);S("queueImg").style.opacity=String(1-detail);
  [17.65,19.75,21.86,23.97].forEach((at,i)=>S("st"+(i+1)).classList.toggle("on",t>=at));
  const vo=E((t-21.6)/.7)*(1-E((t-25.6)/.6));setOp("vetCard",vo);
  if(t>21.4&&!vetStarted){vetStarted=true;S("vetVideo").currentTime=.3;S("vetVideo").play().catch(()=>{})}
  // map + coverage crossfade and counters
  const mc=E((t-30.6)/1.0);S("mapB").style.opacity=String(mc);S("mapA").style.opacity=String(1-mc);
  const mz=E((t-26.2)/9.5);S("mapA").style.transform="scale("+(1.03+.10*mz)+") translate("+(-28*mz)+"px,"+(-15*mz)+"px)";S("mapB").style.transform="scale("+(1.02+.08*mz)+")";
  const pulse=.5+.5*Math.sin((t-27.8)*5.2);S("pin").style.boxShadow="0 0 0 "+(10+20*pulse)+"px rgba(240,91,64,"+(.18*(1-pulse)) +")";
  S("c1").textContent=t<28.45?"0":"1";S("c2").textContent=t<30.15?"0":"1";S("c3").textContent=t<33.55?(t<31.85?"1":"2"):"3";
  if(t>35.45&&!street2Started){street2Started=true;S("street2").currentTime=4.0;S("street2").play().catch(()=>{})}
  const v=E((t-35.7)/6.2);S("street2").style.transform="scale("+(1.11+.03*v)+") translateX("+(-18*v)+"px)";
}
function tick(now){if(!started)return;const t=(now-t0)/1000;render(t);if(t<D+.15)requestAnimationFrame(tick);else window.__filmDone=true}
window.startFilm=async()=>{S("street1").currentTime=.2;await S("street1").play().catch(()=>{});started=true;t0=performance.now();render(0);requestAnimationFrame(tick);return true};
window.__filmReady=true;
</script></body></html>`;
}

async function waitFor(url: string) {
  for (let i=0;i<80;i++) {
    try { const r=await fetch(url); if(r.ok) return; } catch {}
    await new Promise(r=>setTimeout(r,100));
  }
  throw new Error("film server did not start");
}

async function updateManifest() {
  try {
    const path = resolve(OUT, "capture-manifest.json");
    const j = JSON.parse(await readFile(path, "utf8"));
    j.stockSources = [
      { provider: "Pexels", creator: STOCK.street.creator, page: STOCK.street.page },
      { provider: "Pexels", creator: STOCK.vet.creator, page: STOCK.vet.page }
    ];
    j.heroAnimal = { name: "Pinky", source: "public/pinky-bengaluru.jpg" };
    j.master = { durationSeconds: 45, width: 1080, height: 1920, fps: 30 };
    await writeFile(path, JSON.stringify(j, null, 2));
  } catch {}
}

async function main() {
  await mkdir(ASSETS, { recursive: true });
  await Promise.all([
    download(STOCK.street.url, resolve(ASSETS, "street.mp4")),
    download(STOCK.vet.url, resolve(ASSETS, "vet.mp4"))
  ]);
  await makeAudio(WAV);
  await writeFile(resolve(OUT, "film.html"), filmHtml());

  server = spawn("python3", ["-m", "http.server", "3177", "--bind", "127.0.0.1", "--directory", ROOT], { stdio: "inherit" });
  await waitFor("http://127.0.0.1:3177/launch-video-v2/film.html");

  const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT, size: { width: 1080, height: 1920 } }
  });
  const pageMadeAt = Date.now();
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3177/launch-video-v2/film.html", { waitUntil: "networkidle" });
  await page.waitForFunction(() => (window as any).__filmReady === true);
  await page.waitForTimeout(650);
  const startAt = Date.now();
  await page.evaluate(() => (window as any).startFilm());
  await page.waitForFunction(() => (window as any).__filmDone === true, null, { timeout: 52000 });
  await page.waitForTimeout(220);
  const video = page.video();
  await page.close();
  await context.close();
  if (!video) throw new Error("Playwright did not create a recording");
  const recorded = await video.path();
  await browser.close();

  const trim = Math.max(0, (startAt - pageMadeAt) / 1000);
  await run("ffmpeg", [
    "-y","-ss",trim.toFixed(3),"-i",recorded,"-i",WAV,
    "-t","45.000",
    "-vf","fps=30,scale=1080:1920:flags=lanczos,format=yuv420p",
    "-c:v","libx264","-preset","veryfast","-crf","18",
    "-c:a","aac","-b:a","192k","-ar","48000",
    "-movflags","+faststart","-shortest",FINAL
  ]);

  // Final-film contact sheet: 6 readable checkpoints, not raw captures.
  await run("ffmpeg", [
    "-y","-i",FINAL,
    "-vf","select='eq(n,60)+eq(n,255)+eq(n,435)+eq(n,690)+eq(n,945)+eq(n,1260)',scale=360:640,tile=3x2:padding=10:margin=10",
    "-vsync","vfr","-frames:v","1",resolve(OUT,"contact-sheet.png")
  ]);
  await updateManifest();
}

main().catch((e)=>{console.error(e);process.exitCode=1}).finally(()=>{server?.kill("SIGTERM")});
