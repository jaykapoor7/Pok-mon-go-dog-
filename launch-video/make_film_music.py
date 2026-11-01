# Original soundtrack for the launch film (synthesised here; no samples or licences).
import numpy as np, wave
SR = 44100; DUR = 46.8; N = int(SR * DUR)
t = np.arange(N) / SR
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)
BPM = 90; B = 60 / BPM

def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR); n = min(len(sig), N - i)
    if n <= 0: return
    L[i:i+n] += sig[:n] * gain * (1 - max(pan, 0)); R[i:i+n] += sig[:n] * gain * (1 + min(pan, 0))
def env(n, a=0.005, d=0.3):
    x = np.arange(n) / SR; return np.minimum(1, x / a) * np.exp(-x / d)
def kick():
    n = int(0.45 * SR); x = np.arange(n) / SR
    f = 50 + 120 * np.exp(-x * 35); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-x * 7) * 1.0 + np.sin(ph * 2) * np.exp(-x * 30) * 0.2
def hat(d=0.04):
    n = int(0.12 * SR); s = rng.standard_normal(n); s = np.diff(np.concatenate([[0], s])); return s * env(n, 0.001, d) * 0.35
def clap():
    n = int(0.3 * SR); s = rng.standard_normal(n); e = sum(env(n, 0.001, 0.012) * (np.arange(n) >= int(k * 0.011 * SR)) for k in range(3)) + env(n, 0.001, 0.12) * 0.6
    return np.convolve(s, np.ones(6) / 6, "same") * e * 0.55
def tone(freq, dur, wave="saw", a=0.01, d=0.4, cutoff=0.15):
    n = int(dur * SR); x = np.arange(n) / SR
    if wave == "saw": s = sum(np.sin(2 * np.pi * freq * k * x) / k for k in range(1, 9))
    elif wave == "sq": s = sum(np.sin(2 * np.pi * freq * k * x) / k for k in range(1, 9, 2))
    else: s = np.sin(2 * np.pi * freq * x)
    s = np.convolve(s, np.ones(max(1, int(1 / cutoff))) / max(1, int(1 / cutoff)), "same")
    return s * np.minimum(1, x / a) * np.exp(-x / d)
def impact():
    n = int(2.2 * SR); x = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (38 + 60 * np.exp(-x * 8)) * x) * np.exp(-x * 2.2)
    noise = np.convolve(rng.standard_normal(n), np.ones(30) / 30, "same") * np.exp(-x * 4) * 1.5
    return (boom + noise) * 0.9
def riser(dur):
    n = int(dur * SR); x = np.arange(n) / SR
    s = rng.standard_normal(n); out = np.zeros(n); k = 1
    for i in range(0, n, 2048):
        w = max(1, int(60 * (1 - i / n)) + 1); seg = s[i:i+2048]; out[i:i+len(seg)] = np.convolve(seg, np.ones(w) / w, "same")
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 1600 * (x / dur) ** 2) / SR) * 0.15
    return (out * 2.2 + sweep) * (x / dur) ** 2
def chime(freqs):
    return sum(tone(f, 1.6, "sine", 0.002, 0.5) for f in freqs) * 0.25
def whoosh():
    n = int(0.5 * SR); x = np.arange(n) / SR; s = rng.standard_normal(n)
    return np.convolve(s, np.ones(20) / 20, "same") * np.sin(np.pi * x / 0.5) ** 2 * 0.6


mid = lambda m: 440 * 2 ** ((m - 69) / 12)
def pluck(freq, dur=1.6):
    n = int(dur * SR); x = np.arange(n) / SR
    s = np.sin(2*np.pi*freq*x) + 0.35*np.sin(2*np.pi*freq*2*x)*np.exp(-x*6) + 0.15*np.sin(2*np.pi*freq*3*x)*np.exp(-x*9)
    return s * np.minimum(1, x/0.004) * np.exp(-x*2.6) * 0.5
def pad(ms, at, dur, gain=0.07):
    for m in ms: add(tone(mid(m), dur, "saw", 0.8, dur*0.9, 0.04), at, gain, (m % 3 - 1) * 0.5)
def noise_bed(at, dur, gain):
    n = int(dur*SR); s = np.convolve(rng.standard_normal(n), np.ones(200)/200, "same")
    x = np.arange(n)/SR; e = np.minimum(1, x/1.5) * np.minimum(1, (dur-x)/1.5)
    add(s*e*3, at, gain)
def click():
    n = int(0.08*SR); x = np.arange(n)/SR; return rng.standard_normal(n)*np.exp(-x*120)*0.9
def thump():
    n = int(0.9*SR); x = np.arange(n)/SR
    return (np.sin(2*np.pi*(55+90*np.exp(-x*25))*x)*np.exp(-x*6) + np.convolve(rng.standard_normal(n), np.ones(8)/8, "same")*np.exp(-x*30)*0.8)
def scratch(dur):
    n = int(dur*SR); x = np.arange(n)/SR
    s = np.diff(np.concatenate([[0], rng.standard_normal(n)])) * (0.5 + 0.5*np.abs(np.sin(2*np.pi*7*x)))
    return s * 0.12
def rustle(dur):
    n = int(dur*SR); x = np.arange(n)/SR
    return np.convolve(rng.standard_normal(n), np.ones(3)/3, "same") * np.abs(np.sin(np.pi*x/dur)) * (0.4+0.6*np.abs(np.sin(2*np.pi*11*x))) * 0.25

# A · street, 0–6
noise_bed(0, 6.5, 0.25)
pad((57, 64, 71), 0, 7.0, 0.05)
add(tone(1760, 0.07, "sine", 0.001, 0.05), 3.0, 0.25); add(tone(1760, 0.07, "sine", 0.001, 0.05), 3.12, 0.25)
add(click(), 3.5, 1.0); add(click(), 3.58, 0.7); add(whoosh(), 4.1, 0.5)
# B · voice note, 6–14: plucked arpeggio
add(tone(880, 0.12, "sine", 0.002, 0.08), 6.7, 0.3)
seq = [57, 64, 69, 71, 72, 71, 69, 64]
for i in range(int(8 / (B/2))):
    add(pluck(mid(seq[i % 8] + (12 if i % 16 >= 8 else 0))), 6 + i * B/2, 0.42, 0.4 if i % 2 else -0.4)
pad((53, 57, 64), 6, 4, 0.05); pad((50, 57, 62), 10, 4, 0.05)
# C · record, 14–22: soft pulse arrives
for i in range(12):
    tt = 14 + i * B
    add(kick(), tt, 0.55 if i % 2 == 0 else 0.0); add(hat(0.02), tt + B/2, 0.25)
    add(pluck(mid([57, 60, 64, 67][i % 4] + 12)), tt, 0.3)
pad((57, 60, 64), 14, 4, 0.06); pad((53, 57, 60), 18, 4, 0.06)
for k in range(5): add(tone(2600, 0.03, "sine", 0.001, 0.02), 15.5 + k * 0.4, 0.1)  # typewriter ticks
add(thump(), 19.53, 1.0)
# D · wall, 22–30: full groove, tension then resolve
chords = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]
beat = 22; bar = 0
while beat < 42 - 0.01:
    for k in range(4):
        tt = beat + k * B
        add(kick(), tt, 0.9); add(hat(), tt + B/2, 0.45, 0.2)
        if k in (1, 3): add(clap(), tt, 0.6)
        add(tone(mid(chords[bar % 4][0] - 24), B * 0.8, "saw", 0.004, 0.25, 0.1), tt, 0.28)
    pad(chords[bar % 4], beat, 4 * B, 0.06)
    for k in range(8): add(pluck(mid(chords[bar % 4][k % 3] + 24)), beat + k * B/2, 0.12, 0.5 if k % 2 else -0.5)
    beat += 4 * B; bar += 1
for m in (45, 48, 51, 54): add(tone(mid(m), 1.6, "saw", 0.3, 1.2, 0.05), 26.0, 0.12)  # tension
add(impact(), 26.0, 0.55)
add(chime([880, 1108.7, 1318.5]), 28.2, 0.9)  # resolve
# E · folder, 30–36
add(rustle(1.4), 30.2, 1.0); add(rustle(1.0), 31.8, 0.8); add(whoosh(), 32.3, 0.6)
for k in range(6): add(tone(1200 + k*80, 0.06, "sine", 0.001, 0.04), 34.1 + k * 0.17, 0.15)
# F · city, 36–42
add(riser(3.7), 36.0, 0.45); add(whoosh(), 38.7, 0.6)
add(thump(), 39.73, 1.1); add(impact(), 39.73, 0.6)
add(scratch(1.1), 40.13, 1.0)
for k in range(12): add(tone(2093 + (k % 4) * 140, 0.05, "sine", 0.001, 0.03), 40.33 + k * 0.1, 0.12)
# G · home, 42–46.8: warm resolve
pad((57, 61, 64, 69), 42, 4.8, 0.08)
for i, m in enumerate([69, 73, 76, 81]): add(pluck(mid(m), 2.5), 42.1 + i * 0.33, 0.4)
add(chime([440, 554.4, 659.3, 880]), 44.2, 0.9)
mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.3) / np.tanh(1.3)
fo = int(2.0 * SR); mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
mix /= np.max(np.abs(mix)) * 1.12
with wave.open("public/film-music.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype("<i2").tobytes())
print("ok")
