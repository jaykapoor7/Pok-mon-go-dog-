"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ────────────────────────────────────────────────────────────────
// Real 3D "tangled → detangled" scene. Each thread is a tube built
// from a CatmullRom curve whose control points animate per frame
// between a hand-authored knotted state and a straight radial ray.
// ────────────────────────────────────────────────────────────────

type Vec = [number, number, number];

/** How many control points per thread — same across all threads so
 *  they can lerp position-by-position. */
const N = 8;
/** Reach of the fully-detangled ray from origin. */
const R = 1.55;

/** Build the straight-ray control points along a normalised direction. */
function ray(dir: Vec): Vec[] {
  const [dx, dy, dz] = dir;
  const len = Math.hypot(dx, dy, dz);
  const nx = dx / len, ny = dy / len, nz = dz / len;
  return Array.from({ length: N }, (_, i) => {
    const t = i / (N - 1);
    return [nx * R * t, ny * R * t, nz * R * t] as Vec;
  });
}

/** Hand-tuned knot control points per thread. Every path threads through
 *  the origin (index 0), wanders through the inner volume, and — crucially —
 *  its last point is NOT on its final ray, so the initial silhouette is a
 *  genuine tangled mass, not four straight lines rendered from odd angles. */
interface ThreadDef {
  id: string;
  label: string;
  color: string;
  /** RGB emissive to make the tube glow subtly. */
  emissive: string;
  tangled: Vec[];
  detangled: Vec[];
}

const THREADS: ThreadDef[] = [
  {
    id: "government",
    label: "Government",
    color: "#2f63c2",
    emissive: "#1e3a8a",
    tangled: [
      [0, 0, 0],
      [0.6, 0.35, -0.4],
      [-0.5, 0.55, 0.5],
      [0.4, -0.5, 0.55],
      [-0.6, -0.35, -0.5],
      [0.65, 0.15, 0.5],
      [-0.35, 0.65, -0.4],
      [0.55, -0.6, -0.3],
    ],
    detangled: ray([1, 0.55, 0.35]),
  },
  {
    id: "ngo",
    label: "NGO",
    color: "#3e8473",
    emissive: "#1f4a3f",
    tangled: [
      [0, 0, 0],
      [-0.55, 0.4, 0.5],
      [0.5, 0.6, -0.4],
      [-0.4, -0.5, -0.55],
      [0.6, -0.35, 0.5],
      [-0.35, 0.15, -0.65],
      [0.5, -0.6, 0.35],
      [-0.6, 0.55, 0.4],
    ],
    detangled: ray([-1, 0.45, -0.4]),
  },
  {
    id: "community",
    label: "Community",
    color: "#d9a441",
    emissive: "#7a5510",
    tangled: [
      [0, 0, 0],
      [0.5, -0.55, 0.35],
      [-0.6, -0.3, 0.5],
      [0.55, 0.4, -0.5],
      [-0.35, 0.55, -0.45],
      [0.65, -0.15, -0.55],
      [-0.55, -0.6, 0.4],
      [0.4, 0.6, 0.55],
    ],
    detangled: ray([0.85, -0.9, 0.35]),
  },
  {
    id: "research",
    label: "Research",
    color: "#8b5ea8",
    emissive: "#442b57",
    tangled: [
      [0, 0, 0],
      [-0.5, -0.4, -0.55],
      [0.55, -0.5, -0.35],
      [-0.6, 0.5, 0.4],
      [0.35, 0.55, 0.55],
      [-0.65, 0.25, -0.4],
      [0.55, -0.35, 0.6],
      [-0.45, -0.6, 0.4],
    ],
    detangled: ray([-0.9, -0.85, 0.3]),
  },
];

/** Lerp between two Vec arrays into an array of THREE.Vector3. */
function lerpPoints(from: Vec[], to: Vec[], t: number): THREE.Vector3[] {
  return from.map(([ax, ay, az], i) => {
    const [bx, by, bz] = to[i];
    return new THREE.Vector3(ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t);
  });
}

/** Single animated tube. Owns its own progress; the parent just says
 *  where it wants to be and we ease toward it every frame. */
function Thread({
  def,
  targetProgress,
  onEndpoint,
}: {
  def: ThreadDef;
  targetProgress: number;
  onEndpoint: (worldPos: THREE.Vector3, screenT: number) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const progress = useRef(0);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    // Ease toward target — small factor gives ~700ms feel.
    progress.current += (targetProgress - progress.current) * 0.07;
    const p = progress.current;
    const pts = lerpPoints(def.tangled, def.detangled, p);
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.4);
    // Tube radius tapers slightly toward the outer end when detangled — feels less "hosepipey".
    const radius = 0.028 + p * 0.006;
    const geo = new THREE.TubeGeometry(curve, 96, radius, 10, false);
    if (ref.current) {
      ref.current.geometry.dispose();
      ref.current.geometry = geo;
    }
    if (materialRef.current) {
      // Detangled threads brighten; passed-but-not-active threads dim slightly.
      materialRef.current.opacity = 0.55 + p * 0.4;
    }
    // Report endpoint (last curve point) to parent for label positioning.
    onEndpoint(pts[pts.length - 1], p);
  });

  return (
    <mesh ref={ref}>
      <meshStandardMaterial
        ref={materialRef}
        color={def.color}
        emissive={def.emissive}
        emissiveIntensity={0.35}
        roughness={0.35}
        metalness={0.15}
        transparent
        opacity={0.55}
      />
    </mesh>
  );
}

/** Glowing central core representing StrayPaw itself. */
function Core() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.14, 48, 48]} />
        <meshStandardMaterial color="#3b82f6" emissive="#1e40af" emissiveIntensity={0.7} roughness={0.25} metalness={0.35} />
      </mesh>
      {/* Halo ring — a bare torus that only reads at certain camera angles, adds depth. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.006, 12, 64]} />
        <meshBasicMaterial color="#93c5fd" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

/** Camera-orbit controller — a slow, cinematic drift driven by the currently
 *  active stop so the perspective shifts as content changes. */
function CameraDrift({ active }: { active: number }) {
  const { camera } = useThree();
  const target = useRef({ x: 0, y: 0.15, z: 3.4 });
  useFrame(() => {
    // Slight sideways sweep + subtle vertical tilt per stop.
    const t = active;
    target.current.x = Math.sin(t * 0.55) * 0.9;
    target.current.z = 3.4 - t * 0.12;
    target.current.y = 0.15 + Math.cos(t * 0.4) * 0.3;
    camera.position.x += (target.current.x - camera.position.x) * 0.04;
    camera.position.y += (target.current.y - camera.position.y) * 0.04;
    camera.position.z += (target.current.z - camera.position.z) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

interface LabelHandle {
  worldPos: THREE.Vector3;
  progress: number;
}

/** Bridge between the R3F scene and DOM-space labels: writes screen-space
 *  coords onto refs owned by the parent every frame. */
function EndpointProjector({
  handles,
  labelRefs,
  active,
}: {
  handles: React.MutableRefObject<LabelHandle[]>;
  labelRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  active: number;
}) {
  const { camera, size } = useThree();
  useFrame(() => {
    for (let i = 0; i < handles.current.length; i++) {
      const h = handles.current[i];
      const el = labelRefs.current[i];
      if (!el || !h) continue;
      // Hide labels for threads whose progress hasn't kicked in yet.
      const shouldShow = active > i && h.progress > 0.25;
      if (!shouldShow) {
        el.style.opacity = "0";
        continue;
      }
      const v = h.worldPos.clone().project(camera);
      // Clip: hide labels that project outside the visible frustum so they
      // never spill onto the sibling text column.
      if (Math.abs(v.x) > 1 || Math.abs(v.y) > 1 || v.z > 1) {
        el.style.opacity = "0";
        continue;
      }
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      el.style.opacity = active === i + 1 ? "1" : "0.6";
    }
  });
  return null;
}

export function TangledScene({
  active,
  labelRefs,
}: {
  active: number;
  labelRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}) {
  // One shared handles array — Thread writes into it, EndpointProjector reads from it.
  const handles = useMemo<React.MutableRefObject<LabelHandle[]>>(
    () => ({ current: THREADS.map(() => ({ worldPos: new THREE.Vector3(), progress: 0 })) }),
    []
  );

  return (
    <Canvas
      camera={{ position: [0, 0.15, 3.4], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={0.9} />
      <directionalLight position={[-3, -2, -3]} intensity={0.35} color="#a5b4fc" />

      <Core />

      {THREADS.map((t, i) => (
        <Thread
          key={t.id}
          def={t}
          targetProgress={active > i ? 1 : 0}
          onEndpoint={(pos, p) => {
            handles.current[i].worldPos.copy(pos);
            handles.current[i].progress = p;
          }}
        />
      ))}

      <CameraDrift active={active} />
      <EndpointProjector handles={handles} labelRefs={labelRefs} active={active} />
    </Canvas>
  );
}

export const THREAD_META = THREADS.map(({ id, label, color }) => ({ id, label, color }));
