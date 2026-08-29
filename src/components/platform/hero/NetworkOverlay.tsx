"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const BLUE = "#3b82f6";
const CYAN = "#22d3ee";
const AMBER = "#f59e0b";
const GREEN = "#4ade80";

function smoothstep(min: number, max: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function Beacon({
  position,
  appear,
  progress,
  color = BLUE,
  size = 1,
  major = false,
}: {
  position: [number, number, number];
  appear: number;
  progress: number;
  color?: string;
  size?: number;
  major?: boolean;
}) {
  const ref = useRef<THREE.Group>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  const raw = smoothstep(appear, appear + 0.07, progress);

  const mats = useMemo(
    () => ({
      core: new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 1.0,
        roughness: 0.25,
        metalness: 0.1,
        flatShading: true,
      }),
      glow: new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.12,
      }),
      disc: new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.06,
        side: THREE.DoubleSide,
      }),
      stem: new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.35,
      }),
      ring: new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      }),
    }),
    [color],
  );

  useFrame(() => {
    if (!ref.current) return;
    ref.current.visible = raw > 0.01;
    const entrance = raw < 1 ? easeOutBack(raw) : 1;
    const pulse =
      1 + Math.sin(performance.now() * 0.003 + position[0] * 7) * 0.1;
    ref.current.scale.setScalar(entrance * size * pulse);
    ref.current.position.y =
      position[1] +
      Math.sin(performance.now() * 0.0012 + position[0] * 5) * 0.04;

    if (ringRef.current && raw > 0.3) {
      const cycle = (performance.now() * 0.0008 + position[0] * 3) % 2.5;
      const rs = 1 + cycle * 2;
      ringRef.current.scale.set(rs, rs, 1);
      mats.ring.opacity = Math.max(0, 0.3 - cycle * 0.12) * raw;
    }
  });

  const coreR = major ? 0.08 : 0.05;
  const glowR = major ? 0.18 : 0.11;
  const discR = major ? 0.28 : 0.16;

  return (
    <group ref={ref} position={position}>
      <mesh material={mats.core} position={[0, 0.14, 0]}>
        <sphereGeometry args={[coreR, 10, 10]} />
      </mesh>
      <mesh material={mats.glow} position={[0, 0.14, 0]}>
        <sphereGeometry args={[glowR, 8, 8]} />
      </mesh>
      {major && (
        <mesh material={mats.stem} position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.12, 6]} />
        </mesh>
      )}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, 0]}
        material={mats.disc}
      >
        <circleGeometry args={[discR, 20]} />
      </mesh>
      <mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.008, 0]}
        material={mats.ring}
      >
        <ringGeometry args={[0.1, 0.12, 24]} />
      </mesh>
    </group>
  );
}

function Arc({
  start,
  end,
  appear,
  progress,
  color = BLUE,
  radius = 0.01,
}: {
  start: [number, number, number];
  end: [number, number, number];
  appear: number;
  progress: number;
  color?: string;
  radius?: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const raw = smoothstep(appear, appear + 0.1, progress);

  const { geo, tubeMat } = useMemo(() => {
    const dist = Math.sqrt(
      (end[0] - start[0]) ** 2 + (end[2] - start[2]) ** 2,
    );
    const mid: [number, number, number] = [
      (start[0] + end[0]) / 2,
      Math.max(start[1], end[1]) + dist * 0.15 + 0.25,
      (start[2] + end[2]) / 2,
    ];
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...start),
      new THREE.Vector3(...mid),
      new THREE.Vector3(...end),
    );
    const tubeGeo = new THREE.TubeGeometry(curve, 28, radius, 6, false);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
    });
    return { geo: tubeGeo, tubeMat: material };
  }, [start, end, color, radius]);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.visible = raw > 0.01;
    tubeMat.opacity = raw * 0.55;
    if (geo.index) {
      geo.setDrawRange(0, Math.floor(raw * geo.index.count));
    }
  });

  return <mesh ref={ref} geometry={geo} material={tubeMat} />;
}

function PulseNode({
  position,
  appear,
  progress,
  color = CYAN,
  size = 0.045,
}: {
  position: [number, number, number];
  appear: number;
  progress: number;
  color?: string;
  size?: number;
}) {
  const ref = useRef<THREE.Group>(null!);
  const raw = smoothstep(appear, appear + 0.05, progress);

  const mats = useMemo(
    () => ({
      core: new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.7,
        roughness: 0.35,
        flatShading: true,
      }),
      glow: new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.1,
      }),
    }),
    [color],
  );

  useFrame(() => {
    if (!ref.current) return;
    ref.current.visible = raw > 0.01;
    const pulse =
      1 + Math.sin(performance.now() * 0.004 + position[2] * 8) * 0.15;
    ref.current.scale.setScalar(raw * pulse);
  });

  return (
    <group ref={ref} position={position}>
      <mesh material={mats.core}>
        <sphereGeometry args={[size, 8, 8]} />
      </mesh>
      <mesh material={mats.glow}>
        <sphereGeometry args={[size * 2.5, 6, 6]} />
      </mesh>
    </group>
  );
}

const DOG_PIN: [number, number, number] = [0, 0.65, 0.3];

const RESOURCE_NODES: {
  pos: [number, number, number];
  label: string;
  color: string;
}[] = [
  { pos: [-1.8, 0.3, 1.2], label: "NGO", color: CYAN },
  { pos: [1.5, 0.2, -0.9], label: "Vet", color: AMBER },
  { pos: [-1.3, 0.3, -1.4], label: "Volunteer", color: GREEN },
  { pos: [2.0, 0.3, 0.9], label: "Rescuer", color: BLUE },
];

const SCALE_PINS: { pos: [number, number, number]; color: string }[] = [
  { pos: [-3.2, 0, 2.2], color: BLUE },
  { pos: [-2.4, 0, -2.4], color: CYAN },
  { pos: [2.8, 0, -1.8], color: GREEN },
  { pos: [3.5, 0, 1.2], color: AMBER },
  { pos: [-0.8, 0, 3.0], color: BLUE },
  { pos: [2.0, 0, 2.8], color: CYAN },
  { pos: [-3.0, 0, 0.3], color: GREEN },
  { pos: [3.8, 0, -0.6], color: BLUE },
  { pos: [-1.6, 0, -3.2], color: AMBER },
  { pos: [1.0, 0, -2.8], color: CYAN },
  { pos: [3.2, 0, 2.4], color: GREEN },
  { pos: [-3.5, 0, -1.6], color: BLUE },
];

export function NetworkOverlay({ progress }: { progress: number }) {
  return (
    <group>
      {/* Notice/Report: first beacon on the dog */}
      <Beacon
        position={DOG_PIN}
        appear={0.18}
        progress={progress}
        color={GREEN}
        major
        size={1.4}
      />

      {/* Understand: data nodes emerge */}
      <PulseNode
        position={[-0.5, 0.12, 0.7]}
        appear={0.32}
        progress={progress}
        color={GREEN}
        size={0.05}
      />
      <PulseNode
        position={[0.35, 0.18, -0.2]}
        appear={0.35}
        progress={progress}
        color={BLUE}
        size={0.04}
      />
      <PulseNode
        position={[0.2, 0.08, 0.8]}
        appear={0.38}
        progress={progress}
        color={GREEN}
        size={0.035}
      />

      {/* Connect: resource beacons + arcs to dog */}
      {RESOURCE_NODES.map((n, i) => (
        <Beacon
          key={n.label}
          position={n.pos}
          appear={0.46 + i * 0.025}
          progress={progress}
          color={n.color}
          major
        />
      ))}
      {RESOURCE_NODES.map((n, i) => (
        <Arc
          key={`arc-${n.label}`}
          start={DOG_PIN}
          end={n.pos}
          appear={0.48 + i * 0.025}
          progress={progress}
          color={n.color}
          radius={0.012}
        />
      ))}

      {/* Act: cross-connections between resources */}
      <Arc
        start={RESOURCE_NODES[0].pos}
        end={RESOURCE_NODES[1].pos}
        appear={0.63}
        progress={progress}
        color={CYAN}
        radius={0.008}
      />
      <Arc
        start={RESOURCE_NODES[2].pos}
        end={RESOURCE_NODES[3].pos}
        appear={0.66}
        progress={progress}
        color={GREEN}
        radius={0.008}
      />
      <Arc
        start={RESOURCE_NODES[0].pos}
        end={RESOURCE_NODES[2].pos}
        appear={0.69}
        progress={progress}
        color={BLUE}
        radius={0.006}
      />
      <Arc
        start={RESOURCE_NODES[1].pos}
        end={RESOURCE_NODES[3].pos}
        appear={0.72}
        progress={progress}
        color={AMBER}
        radius={0.006}
      />

      {/* Scale: network erupts across the ground */}
      {SCALE_PINS.map((pin, i) => (
        <Beacon
          key={`s-${i}`}
          position={pin.pos}
          appear={0.76 + i * 0.01}
          progress={progress}
          color={pin.color}
          size={0.85}
        />
      ))}
      {SCALE_PINS.slice(0, 8).map((pin, i) => (
        <Arc
          key={`sa-${i}`}
          start={DOG_PIN}
          end={pin.pos}
          appear={0.8 + i * 0.012}
          progress={progress}
          color={pin.color}
          radius={0.007}
        />
      ))}
      {SCALE_PINS.slice(0, 6).map((pin, i) => (
        <Arc
          key={`sx-${i}`}
          start={pin.pos}
          end={SCALE_PINS[(i + 3) % SCALE_PINS.length].pos}
          appear={0.85 + i * 0.015}
          progress={progress}
          color={BLUE}
          radius={0.005}
        />
      ))}
    </group>
  );
}
