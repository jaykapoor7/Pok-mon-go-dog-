# Original soundtrack for the launch film (synthesised here; no samples or licences).
import numpy as np, wave
SR = 44100; DUR = 26.2; N = int(SR * DUR)
t = np.arange(N) / SR
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)
BPM = 120; B = 60 / BPM
DROP = 1.5; END = 22.0; LOGO = 22.4
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


def buzz(d=0.35):
    n = int(d * SR); x = np.arange(n) / SR
    return (np.sign(np.sin(2 * np.pi * 150 * x)) * 0.5 + np.sin(2 * np.pi * 300 * x) * 0.3) * (np.sin(np.pi * x / d) ** 0.5) * 0.35
# Hook: two phone buzzes, a riser, then the drop
add(buzz(), 0.05, 0.9); add(buzz(), 0.55, 0.9)
add(riser(DROP), 0, 0.5)
add(impact(), DROP, 1.0)
chords = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
beat = DROP; bar = 0
while beat < END - 0.01:
    for k in range(4):
        tt = beat + k * B
        if tt >= END: break
        add(kick(), tt, 1.0)
        if k in (1, 3): add(clap(), tt, 0.75, -0.1)
        add(hat(), tt + B / 2, 0.6, 0.25); add(hat(0.015), tt + B / 4, 0.22, -0.3); add(hat(0.015), tt + 3 * B / 4, 0.22, 0.3)
        root = chords[bar % 4][0] - 24
        add(tone(mid(root), B * 0.45, "saw", 0.004, 0.12, 0.1), tt, 0.3); add(tone(mid(root), B * 0.45, "saw", 0.004, 0.12, 0.1), tt + B / 2, 0.3)
    for m in chords[bar % 4]: add(tone(mid(m), 4 * B, "saw", 0.05, 1.4, 0.06), beat, 0.07, (m % 3 - 1) * 0.4)
    for k in range(16):
        m = chords[bar % 4][k % 3] + 12 + (12 if (k // 4) % 2 else 0)
        add(tone(mid(m), 0.12, "sq", 0.002, 0.06, 0.3), beat + k * B / 4, 0.04, 0.5 if k % 2 else -0.5)
    beat += 4 * B; bar += 1
for s in [4.0, 6.5, 8.0, 11.5, 14.0, 16.5, 19.0]: add(whoosh(), s - 0.22, 0.75)
add(chime([1046.5, 1318.5, 1568]), 7.13, 1.0)
for k in range(4): add(tone(330, 0.18, "sq", 0.002, 0.1, 0.5), 9.8 + k * 0.12, 0.35)
add(impact(), 13.23, 0.8)
for k in range(12): add(tone(1400 + k * 60, 0.05, "sine", 0.001, 0.03), 14.05 + k * 0.05, 0.12)
add(impact(), 17.7, 1.0)
for k in range(18): add(tone(2093 + (k % 6) * 120, 0.05, "sine", 0.001, 0.03), 19.13 + k * 0.066, 0.13)
add(impact(), 20.33, 0.8); add(chime([1318.5, 1568, 2093]), 20.33, 0.8)
for m in (57, 60, 64, 69): add(tone(mid(m), 4.2, "saw", 0.2, 2.5, 0.05), END, 0.09, (m % 3 - 1) * 0.4)
add(impact(), END, 1.0); add(chime([523.25, 659.25, 783.99, 1046.5]), END + 0.05, 1.0)
add(buzz(), 25.45, 0.9); add(buzz(), 25.85, 0.6)
mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.5) / np.tanh(1.5)
fi = int(0.03 * SR); mix[:fi] *= np.linspace(0, 1, fi)[:, None]
mix /= np.max(np.abs(mix)) * 1.1
with wave.open("public/reel-music.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype("<i2").tobytes())
print("ok")
