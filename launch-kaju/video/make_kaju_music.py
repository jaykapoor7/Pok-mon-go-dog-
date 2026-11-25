"""Music bed for the Kaju launch films. Original synthesis (numpy only), so there is nothing to license.

Calm, modern, slightly warm. 100 BPM, D major (I - vi - IV - V). Soft mallet, a muted pluck, a sine sub and an
airy pad. It is written to sit under speech: the sub lives below 150 Hz, the air above 5 kHz, and the few notes
that land between 300 Hz and 3 kHz are short, quiet and far apart.

    python3 make_kaju_music.py            # the three stock lengths: 40 s, 50 s, 60 s
    python3 make_kaju_music.py 23.5 31    # any other lengths, in seconds

Each length is composed, not faded: the last bar lands on the tonic and rings out over the final ~2.6 s.
Output: public/music/kaju-<length>s.wav, 48 kHz stereo 16-bit, peak -3 dBFS.
"""
import sys, wave
import numpy as np

SR = 48000
BPM = 100.0
B = 60.0 / BPM          # one beat
BAR = 4 * B
TAIL = 2.6              # the final chord rings for this long

def mid(m): return 440.0 * 2 ** ((m - 69) / 12)

def band(x, lo=None, hi=None):
    """Zero-phase FFT band limit with soft shoulders."""
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if lo: g *= 1 / (1 + (lo / np.maximum(f, 1e-6)) ** 6)
    if hi: g *= 1 / (1 + (f / hi) ** 6)
    return np.fft.irfft(X * g, len(x))

def mallet(freq, dur=1.4):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) * np.exp(-t * 3.2)
    s += 0.22 * np.sin(2 * np.pi * freq * 4.0 * t) * np.exp(-t * 16)      # the wooden "tock"
    s += 0.08 * np.sin(2 * np.pi * freq * 9.2 * t) * np.exp(-t * 40)
    return s * np.minimum(1, t / 0.003)

def pluck(freq, dur=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t + 1.4 * np.sin(2 * np.pi * freq * t) * np.exp(-t * 22))
    return s * np.minimum(1, t / 0.004) * np.exp(-t * 9)

def sub(freq, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    e = np.minimum(1, t / 0.03) * np.minimum(1, (dur - t) / 0.12).clip(0)
    return (np.sin(2 * np.pi * freq * t) + 0.12 * np.sin(4 * np.pi * freq * t)) * e

def pad(freqs, dur, rng):
    """Airy pad: a low body under 280 Hz plus breath above 5 kHz. The middle is left open for speech."""
    n = int(dur * SR); t = np.arange(n) / SR
    e = np.minimum(1, t / (dur * 0.35)) * np.minimum(1, (dur - t) / (dur * 0.4)).clip(0)
    body = sum(np.sin(2 * np.pi * (f / 2) * t + rng.uniform(0, 6.28)) for f in freqs) / len(freqs)
    air = band(rng.standard_normal(n), 5200, 11000) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.21 * t + rng.uniform(0, 6.28)))
    shimmer = sum(np.sin(2 * np.pi * f * 8 * t + rng.uniform(0, 6.28)) for f in freqs[:2]) * 0.012
    return (band(body, None, 280) * 0.9 + air * 0.5 + shimmer) * e

def kick():
    n = int(0.28 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (46 + 60 * np.exp(-t * 38)) * t) * np.exp(-t * 15)

def shaker(rng, dur=0.07):
    n = int(dur * SR); t = np.arange(n) / SR
    return band(rng.standard_normal(n), 6500, None) * np.minimum(1, t / 0.008) * np.exp(-t * 55)

#           root  pad voicing (midi)        mallet pool
CHORDS = [(38, (62, 66, 69, 73), (74, 78, 81, 85)),    # D  maj7
          (35, (59, 62, 66, 69), (74, 78, 81, 86)),    # B  m7
          (31, (59, 62, 66, 71), (74, 79, 83, 86)),    # G  maj7
          (33, (57, 61, 64, 69), (73, 76, 81, 85))]    # A  (6)
MOTIF = [(0.0, 2), (1.5, 1), (2.5, 3), (3.0, 0)]        # (beat, index into the mallet pool): four notes a bar at most

def build(length):
    rng = np.random.default_rng(7)
    n = int(round(length * SR)); L = np.zeros(n); R = np.zeros(n)
    def add(sig, at, gain=1.0, pan=0.0):
        i = int(round(at * SR))
        if i >= n or i < 0: return
        sig = sig[: n - i]
        L[i:i + len(sig)] += sig * gain * (1 - max(0, pan)); R[i:i + len(sig)] += sig * gain * (1 + min(0, pan))
    bars = int((length - TAIL) // BAR)
    t0 = (length - TAIL) - bars * BAR          # a breath of pad before bar one, so the ending always lands on time
    if t0 > 0.05: add(pad([mid(m) for m in CHORDS[0][1]], t0 + BAR * 0.5, rng), 0, 0.5)
    for b in range(bars):
        at = t0 + b * BAR; root, voicing, pool = CHORDS[b % 4]
        last = bars - b                          # bars left before the final chord
        full = b >= 4 and last > 2               # the middle of the piece carries the pulse
        add(pad([mid(m) for m in voicing], BAR * 1.35, rng), at, 0.55, 0.0)
        add(pad([mid(m) for m in voicing], BAR * 1.35, rng), at + 0.011, 0.25, -0.8)
        add(sub(mid(root), BAR * 0.96), at, 0.36 if b >= 2 else 0.24)
        for beat, k in MOTIF:
            if b < 2 and beat not in (0.0, 2.5): continue           # the opening is two notes a bar
            if last <= 2 and beat == 1.5: continue                  # thin out before the end
            add(mallet(mid(pool[(k + b // 4) % 4])), at + beat * B, 0.21, -0.35 if k % 2 else 0.35)
        if full:
            for k in (0, 2): add(kick(), at + k * B, 0.42)
            for k in range(8):
                if k % 2: add(shaker(rng), at + k * B / 2 + rng.uniform(-0.004, 0.004), 0.06 + 0.03 * (k % 4 == 3), 0.3)
            for k in (1, 3, 6):                                      # muted pluck, three notes a bar, low octave
                add(pluck(mid(voicing[k % 3] - 12)), at + k * B / 2, 0.09, 0.5 if k % 2 else -0.5)
        elif b >= 2 and last > 1:
            add(kick(), at, 0.3)
    # the ending: tonic, rolled, ringing out
    end = t0 + bars * BAR
    add(pad([mid(m) for m in (62, 66, 69, 74)], TAIL + 0.2, rng), end - 0.6, 0.6)
    add(sub(mid(38), TAIL * 0.8), end, 0.36)
    for i, m in enumerate((74, 78, 81, 86)): add(mallet(mid(m), 2.4), end + i * 0.085, 0.2, (i - 1.5) * 0.3)
    add(kick(), end, 0.4)
    mix = np.stack([L, R], 1)
    mix = np.tanh(mix * 1.1)
    fi = int(0.02 * SR); mix[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo = int(0.9 * SR); mix[-fo:] *= (np.cos(np.linspace(0, np.pi, fo)) * 0.5 + 0.5)[:, None]   # the ring-out reaches silence
    mix *= 10 ** (-3 / 20) / np.max(np.abs(mix))
    return mix

def write(path, mix):
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype("<i2").tobytes())

if __name__ == "__main__":
    import os
    os.makedirs("public/music", exist_ok=True)
    for s in ([float(a) for a in sys.argv[1:]] or [40, 50, 60]):
        name = f"public/music/kaju-{s:g}s.wav"; write(name, build(s)); print(name)
