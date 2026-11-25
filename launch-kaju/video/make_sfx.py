"""Sound design for the Kaju launch films. Original synthesis (numpy only). Every sound is small on purpose.

    python3 make_sfx.py        ->  public/sfx/{click,key-1..6,whoosh,chime,pop}.wav   (48 kHz stereo 16-bit)
"""
import os, wave
import numpy as np

SR = 48000
rng = np.random.default_rng(11)

def band(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if lo: g *= 1 / (1 + (lo / np.maximum(f, 1e-6)) ** 6)
    if hi: g *= 1 / (1 + (f / hi) ** 6)
    return np.fft.irfft(X * g, len(x))

def write(name, sig, peak_db):
    sig = np.asarray(sig, float)
    if sig.ndim == 1: sig = np.stack([sig, sig], 1)
    f = int(0.004 * SR); sig[-f:] *= np.linspace(1, 0, f)[:, None]
    sig *= 10 ** (peak_db / 20) / np.max(np.abs(sig))
    with wave.open(f"public/sfx/{name}.wav", "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((sig * 32767).astype("<i2").tobytes())
    print(f"public/sfx/{name}.wav")

def click():
    """Pointer click: a soft, slightly woody tick with a short low body."""
    n = int(0.09 * SR); t = np.arange(n) / SR
    tick = band(rng.standard_normal(n), 1800, 7000) * np.exp(-t * 320)
    body = np.sin(2 * np.pi * (210 + 240 * np.exp(-t * 90)) * t) * np.exp(-t * 70)
    return tick * 0.8 + body * 0.6

def key(seed):
    """Key tick: a very short muted tap. Six of them, each a little different, so typing never machine-guns."""
    r = np.random.default_rng(100 + seed)
    n = int(0.05 * SR); t = np.arange(n) / SR
    f = r.uniform(950, 1500)
    return band(r.standard_normal(n), f, f * 4.5) * np.exp(-t * r.uniform(380, 520)) + 0.35 * np.sin(2 * np.pi * r.uniform(150, 230) * t) * np.exp(-t * 130)

def whoosh():
    """Transition: filtered air that swells and passes, left to right."""
    dur = 0.5; n = int(dur * SR); t = np.arange(n) / SR
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2.2
    lo = band(rng.standard_normal(n), 300, 1400); hi = band(rng.standard_normal(n), 1400, 6000)
    x = t / dur; s = (lo * (1 - x) + hi * x) * env
    return np.stack([s * (1 - 0.5 * x), s * (0.5 + 0.5 * x)], 1)

def chime():
    """A completed answer: two soft bell partials a fifth apart, the second a breath later."""
    n = int(1.3 * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for f, at, g in ((1174.66, 0.0, 1.0), (1760.0, 0.075, 0.75)):
        i = int(at * SR); tt = t[: n - i]
        s[i:] += g * (np.sin(2 * np.pi * f * tt) + 0.18 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt * 9)) * np.minimum(1, tt / 0.004) * np.exp(-tt * 4.2)
    return s

def pop():
    """A callout arriving: a small rounded pop."""
    n = int(0.09 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (330 + 420 * np.exp(-t * 60)) * t) * np.minimum(1, t / 0.002) * np.exp(-t * 55)

if __name__ == "__main__":
    os.makedirs("public/sfx", exist_ok=True)
    write("click", click(), -8)
    for i in range(6): write(f"key-{i + 1}", key(i), -16)
    write("whoosh", whoosh(), -10)
    write("chime", chime(), -9)
    write("pop", pop(), -10)
