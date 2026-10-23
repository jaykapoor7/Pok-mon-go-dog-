/* The sounds of the wall, synthesised: no audio files. A can's rattle (the
   mixing ball), the hiss of spray, the lamp's click and hum, and a low swell
   as the piece is finished. Sound waits for the visitor's first touch. */

export class Sfx {
  private ctx: AudioContext | null = null;
  private hissGain: GainNode | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;

  start() {
    if (this.ctx) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 1; this.master.connect(ctx.destination);
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    /* The hiss: steady noise, shaped to the high, airy band of an aerosol. */
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1900;
    const bp = ctx.createBiquadFilter(); bp.type = "peaking"; bp.frequency.value = 6200; bp.gain.value = 6;
    this.hissGain = ctx.createGain(); this.hissGain.gain.value = 0;
    src.connect(hp).connect(bp).connect(this.hissGain).connect(this.master);
    src.start();
  }

  resume() { if (this.ctx?.state === "suspended") this.ctx.resume().catch(() => undefined); }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
  }

  hiss(on: boolean, level = 0.2) {
    if (!this.ctx || !this.hissGain) return;
    this.hissGain.gain.setTargetAtTime(on ? level : 0, this.ctx.currentTime, on ? 0.015 : 0.04);
  }

  /* The mixing ball: a run of short, bright clacks. */
  rattle(times = 7, gap = 0.11) {
    const ctx = this.ctx; if (!ctx || !this.noise || !this.master) return;
    for (let i = 0; i < times; i++) {
      const t = ctx.currentTime + i * gap + Math.random() * 0.02;
      const s = ctx.createBufferSource(); s.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2600 + Math.random() * 900; f.Q.value = 7;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      s.connect(f).connect(g).connect(this.master); s.start(t, Math.random(), 0.08);
    }
  }

  /* The street lamp: a relay click and a mains hum. */
  lamp(on: boolean) {
    const ctx = this.ctx; if (!ctx || !this.noise || !this.master) return;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1200; f.Q.value = 2;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    s.connect(f).connect(g).connect(this.master); s.start(t, 0, 0.06);
    if (!on) return;
    const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = 100;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 240;
    const hg = ctx.createGain(); hg.gain.setValueAtTime(0, t); hg.gain.linearRampToValueAtTime(0.025, t + 0.2); hg.gain.linearRampToValueAtTime(0, t + 2.4);
    o.connect(lp).connect(hg).connect(this.master); o.start(t); o.stop(t + 2.5);
  }

  /* The piece finished: a slow, low swell with a soft shimmer on top. */
  swell() {
    const ctx = this.ctx; if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    for (const [freq, vol] of [[55, 0.22], [82.5, 0.12], [220, 0.035], [330, 0.025]] as const) {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(freq * 0.94, t); o.frequency.linearRampToValueAtTime(freq, t + 2);
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 1.4); g.gain.exponentialRampToValueAtTime(0.001, t + 5.5);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + 5.6);
    }
  }

  stop() { this.ctx?.close().catch(() => undefined); this.ctx = null; this.hissGain = null; this.master = null; }
}
