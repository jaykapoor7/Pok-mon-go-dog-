"use client";

import { useRef, useMemo, useState, useEffect, Suspense, forwardRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Beacon, Arc } from "./NetworkOverlay";
import { COUNTRY_RABIES_STATS } from "@/lib/platform/globalStats";

/* ───────────────────────────────────────────────────────────────────
   Globe — short cinematic transition: rotating world → converges on
   India → bursts into the sighting/community nodes that carry into
   the rest of the scroll story. Deliberately restrained: no on-canvas
   labels, no chart, just a texture of scale followed by one dramatic
   real, sourced fact (India's share of global rabies deaths) resolved
   into nodes. Detailed sourcing lives behind the page's SourceBadge,
   not on the canvas.
─────────────────────────────────────────────────────────────────── */

const RADIUS = 1.35;
const AMBER = "#F5A623"; // matches the dog's hero color — visual through-line
const AMBER_DIM = "#c9843f";

function latLngToVec3(lat: number, lng: number, r: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return [
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  ];
}

// Approximate centroid lat/lng — stylized placement, not survey-grade.
const COUNTRY_LATLNG: Record<string, [number, number]> = {
  IN: [21, 78],
  CN: [35, 105],
  NG: [9, 8],
  PK: [30, 70],
  ET: [9, 40],
};

const INDIA_STAT = COUNTRY_RABIES_STATS.find((c) => c.iso2 === "IN")!;
const MAX_DEATHS = Math.max(...COUNTRY_RABIES_STATS.map((c) => c.deaths));

/** India's facing angle so the rotation can ease toward it. */
const INDIA_THETA = (COUNTRY_LATLNG.IN[1] + 180) * (Math.PI / 180);

const WorldDots = forwardRef<THREE.Points>(function WorldDots(_props, ref) {
  const geo = useMemo(() => {
    const count = 220;
    const positions = new Float32Array(count * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      const [x, , z] = [Math.cos(theta) * r, y, Math.sin(theta) * r];
      const p = new THREE.Vector3(x, y, z).multiplyScalar(RADIUS * 1.004);
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color="#5b7aa8" size={0.018} transparent opacity={0.4} sizeAttenuation />
    </points>
  );
});

function CountryMarker({
  iso2,
  deaths,
  emphasize,
  burstT,
}: {
  iso2: string;
  deaths: number;
  emphasize: boolean;
  burstT: number;
}) {
  const [lat, lng] = COUNTRY_LATLNG[iso2];
  const pos = latLngToVec3(lat, lng, RADIUS * 1.01);
  const scale = 0.4 + 0.9 * Math.sqrt(deaths / MAX_DEATHS);
  const ref = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.visible = burstT < 0.85;
    const fade = 1 - Math.min(1, burstT / 0.85);
    ref.current.scale.setScalar((emphasize ? 1 : 0.7) * fade + 0.001);
  });

  return (
    <group ref={ref} position={pos}>
      <mesh>
        <sphereGeometry args={[0.028 * scale, 8, 8]} />
        <meshStandardMaterial
          color={emphasize ? AMBER : AMBER_DIM}
          emissive={emphasize ? AMBER : AMBER_DIM}
          emissiveIntensity={emphasize ? 1.1 : 0.4}
          roughness={0.4}
          flatShading
        />
      </mesh>
      {emphasize && (
        <mesh>
          <sphereGeometry args={[0.07 * scale, 8, 8]} />
          <meshBasicMaterial color={AMBER} transparent opacity={0.14} />
        </mesh>
      )}
    </group>
  );
}

/* Scattered across the whole visible globe face (StrayPaw's impact goal:
   a network reaching everywhere, not one small huddle of nodes). */
const BURST_NODES: [number, number, number][] = (() => {
  const count = 16;
  const pts: [number, number, number][] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const yy = 1 - (i / (count - 1)) * 1.4; // bias to front-facing hemisphere
    const r = Math.sqrt(Math.max(0, 1 - yy * yy));
    const theta = golden * i;
    const rad = 0.62 + (i % 3) * 0.14;
    pts.push([Math.cos(theta) * r * rad, yy * rad * 0.75, Math.sin(theta) * r * rad + 0.15]);
  }
  return pts;
})();
/* Hub-and-spoke: node 0 is the origin dog/sighting, the rest connect back
   to it and to their nearest neighbour so the web reads as one network. */
const BURST_ARCS: [number, number][] = [
  [0, 1], [0, 3], [0, 6], [0, 9], [0, 12],
  [1, 2], [3, 4], [4, 5], [6, 7], [7, 8], [9, 10], [10, 11], [12, 13], [13, 14], [14, 15],
];

function BurstCluster({ burstT }: { burstT: number }) {
  const raw = Math.max(0, Math.min(1, (burstT - 0.4) / 0.45));
  return (
    <group>
      {BURST_NODES.map((p, i) => (
        <Beacon
          key={i}
          position={p}
          appear={0.02 + i * 0.03}
          progress={raw}
          color={i === 0 ? AMBER : "#4ade80"}
          major={i === 0}
          size={i === 0 ? 1.2 : 0.6}
        />
      ))}
      {BURST_ARCS.map(([a, b], i) => (
        <Arc
          key={`a${i}`}
          start={BURST_NODES[a]}
          end={BURST_NODES[b]}
          appear={0.12 + i * 0.035}
          progress={raw}
          color={a === 0 ? AMBER : "#4ade80"}
          radius={0.006}
        />
      ))}
    </group>
  );
}

function Scene({ active }: { active: boolean }) {
  const groupRef = useRef<THREE.Group>(null!);
  const globeOpacityRef = useRef({ dots: 0.4, sphere: 0.28 });
  const [burstT, setBurstT] = useState(0);
  const elapsed = useRef(0);
  const dotsRef = useRef<THREE.Points>(null!);
  const sphereMatRef = useRef<THREE.MeshBasicMaterial>(null!);

  useEffect(() => {
    elapsed.current = 0;
    setBurstT(0);
  }, [active]);

  useFrame((_, dt) => {
    if (!active) return;
    elapsed.current += dt;
    const t = elapsed.current;

    // Compressed timeline so the payoff lands within typical scroll dwell
    // time: 0–1.0s free rotation, 1.0–2.0s ease toward India, 2.0–2.8s burst.
    if (groupRef.current) {
      if (t < 1.0) {
        groupRef.current.rotation.y += dt * 0.8;
      } else {
        const target = -INDIA_THETA + Math.PI / 2;
        const ease = Math.min(1, (t - 1.0) / 1.0);
        const smooth = ease * ease * (3 - 2 * ease);
        const current = groupRef.current.rotation.y;
        const diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
        groupRef.current.rotation.y = current + diff * smooth * 0.14;
      }
    }

    const bt = Math.max(0, Math.min(1, (t - 2.0) / 0.8));
    setBurstT(bt);

    const fade = 1 - bt;
    if (dotsRef.current) {
      (dotsRef.current.material as THREE.PointsMaterial).opacity = globeOpacityRef.current.dots * fade;
    }
    if (sphereMatRef.current) {
      sphereMatRef.current.opacity = globeOpacityRef.current.sphere * fade;
    }
    if (groupRef.current) {
      groupRef.current.visible = fade > 0.01;
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 3, 4]} intensity={1.1} color="#fff4e0" />
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[RADIUS, 13, 10]} />
          <meshBasicMaterial
            ref={sphereMatRef}
            color="#16294a"
            transparent
            opacity={0.28}
            wireframe
          />
        </mesh>
        <WorldDots ref={dotsRef} />
        {COUNTRY_RABIES_STATS.map((c) => (
          <CountryMarker
            key={c.iso2}
            iso2={c.iso2}
            deaths={c.deaths}
            emphasize={c.iso2 === "IN"}
            burstT={burstT}
          />
        ))}
      </group>
      <BurstCluster burstT={burstT} />
    </>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function useWebGLSupport() {
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const ok = !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
      setSupported(ok);
    } catch {
      setSupported(false);
    }
  }, []);
  return supported;
}

/** Static, motion-free placeholder — used off-stage, for reduced motion,
 *  and when WebGL isn't available. Keeps layout stable, no animation cost. */
function StaticFallback() {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="300" fill="#070f20" />
      <circle cx="200" cy="150" r="88" fill="none" stroke="#26385c" strokeWidth="1" opacity="0.5" />
      <circle cx="200" cy="150" r="60" fill="none" stroke="#26385c" strokeWidth="1" opacity="0.4" />
      <circle cx="228" cy="138" r="5" fill={AMBER} opacity="0.85" />
      <circle cx="228" cy="138" r="11" fill={AMBER} opacity="0.15" />
    </svg>
  );
}

export function GlobeScene({ active }: { active: boolean }) {
  const reducedMotion = useReducedMotion();
  const webglOk = useWebGLSupport();

  if (!active || reducedMotion || !webglOk) {
    return <StaticFallback />;
  }

  return (
    <div className="h-full w-full bg-[#070f20]">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 3.6], fov: 42, near: 0.1, far: 20 }}
        gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
      >
        <Suspense fallback={null}>
          <Scene active={active} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export { INDIA_STAT };
