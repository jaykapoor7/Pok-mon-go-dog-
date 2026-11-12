"""Normalise product CSS onto the 8-point system.
   spacing (padding/margin/gap): 4 8 12 16 24 32 40 48 56 64 … (1px hairline nudges kept)
   radius: 4 8 12 16 24, pills untouched
   font-size: 12 14 16 20 24 32 40 48 56 64 80
   Usage: python3 scripts/grid8.py [--write] files…
   Without --write it lists values off the scale and exits 1 if there are any.
   See DESIGN.md, "The 8-point system"."""
import re, sys
SPACE = [0, 4, 8, 12, 16, 24, 32, 40, 48, 56, 64, 72, 80, 96]
RADIUS = [0, 4, 8, 12, 16, 24]
FONT = [12, 14, 16, 20, 24, 32, 40, 48, 56, 64, 72, 80, 96]

def nearest(v, scale, up):
    if v > scale[-1]: return round(v / 8) * 8
    lo = max([s for s in scale if s <= v], default=scale[0]); hi = min([s for s in scale if s >= v], default=scale[-1])
    if v - lo == hi - v: return hi if up else lo
    return lo if v - lo < hi - v else hi

def space(v, prop):
    a = abs(v)
    if a in (0, 1): return v
    if a <= 3: m = 4
    else: m = nearest(a, SPACE, up=not prop.endswith("gap"))
    return -m if v < 0 else m

def radius(v):
    if v >= 40: return v           # pills (999px, 99px, 40px+) keep
    if v <= 1: return v
    if v <= 3: return 4
    return nearest(v, RADIUS, up=False)

def font(v):
    if v < 12: return 12
    return nearest(v, FONT, up=v < 24)

PX = re.compile(r'(?<![\w.#-])(-?\d*\.?\d+)px')
DECL = re.compile(r'(?P<prop>(?<![\w-])(?:padding(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?|margin(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?|gap|row-gap|column-gap|border(?:-(?:top|bottom)-(?:left|right))?-radius|font-size|font))\s*:\s*(?P<val>[^;{}]+)')
def fix(prop, val, stats):
    def sub(m):
        v = float(m.group(1))
        if prop == 'font':
            return m.group(0)
        n = font(v) if prop == 'font-size' else radius(v) if prop.endswith('radius') else space(v, prop)
        if n != v: stats[prop.split('-')[0] if not prop.endswith('radius') else 'radius'] = stats.get(prop.split('-')[0] if not prop.endswith('radius') else 'radius', 0) + 1
        return f"{int(n) if float(n).is_integer() else n}px"
    if prop == 'font':
        # only the size in the shorthand: "<weight> <size>px[/lh]"
        def fs(m):
            v = float(m.group(2)); n = font(v)
            if n != v: stats['font'] = stats.get('font', 0) + 1
            return f"{m.group(1)}{int(n)}px"
        return re.sub(r'(^|\s)(\d*\.?\d+)px(?=/|\s)', fs, val, count=1)
    return PX.sub(sub, val)

write = '--write' in sys.argv
files = [f for f in sys.argv[1:] if f != '--write']
total = {}
for f in files:
    s = open(f).read(); stats = {}
    def keep(m):
        nv = fix(m.group('prop'), m.group('val'), stats)
        if nv == m.group('val'): return m.group(0)
        a, b = m.start('val') - m.start(), m.end('val') - m.start()
        return m.group(0)[:a] + nv + m.group(0)[b:]
    out = DECL.sub(keep, s)
    # keep the original spacing after the colon where nothing changed
    if stats:
        for k, v in stats.items(): total[k] = total.get(k, 0) + v
        if write: open(f, 'w').write(out)
        else: print(f"{f}: {sum(stats.values())} values off the scale")
print(('changed' if write else 'off the scale'), total or 'none')
sys.exit(1 if total and not write else 0)
