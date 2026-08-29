"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Scroll-driven 3D elements that build up around the dog:           */
/*  map pins, connection lines, node dots, expanding network.         */
/*  Each element fades in at a specific scroll threshold.             */
/* ------------------------------------------------------------------ */

const PIN_COLOR = "#4ade80"; // green pin (like the inspiration images)
const LINE_COLOR = "#38bdf8"; // cyan network lines
const NODE_COLOR = "#3b7de6"; // paw blue

function smoothstep(min: number, max: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

function Pin({
  position,
  appear,
  progress,
}: {
  position: [number, number, number];
  appear: number;
  progress: number;
}) {
  const ref = useRef<THREE.Group>(null!);
  const opacity = smoothstep(appear, appear + 0.06, progress);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.visible = opacity > 0.01;
    ref.current.scale.setScalar(opacity);
    ref.current.position.y =
      position[1] + Math.sin(performance.now() * 0.002 + position[0] * 10) * 0.03;
  });

  return (
    <group ref={ref} position={position}>
      {/* Pin head */}
      <mesh position={[0, 0.12, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color={PIN_COLOR} transparent opacity={0.9} />
      </mesh>
      {/* Pin stem */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.1, 6]} />
        <meshBasicMaterial color={PIN_COLOR} transparent opacity={0.6} />
      </mesh>
      {/* Ground glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[0.06, 16]} />
        <meshBasicMaterial color={PIN_COLOR} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function ConnectionLine({
  start,
  end,
  appear,
  progress,
}: {
  start: [number, number, number];
  end: [number, number, number];
  appear: number;
  progress: number;
}) {
  const ref = useRef<THREE.Group>(null!);
  const opacity = smoothstep(appear, appear + 0.08, progress);

  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const mid: [number, number, number] = [
      (start[0] + end[0]) / 2,
      Math.max(start[1], end[1]) + 0.15,
      (start[2] + end[2]) / 2,
    ];
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...start),
      new THREE.Vector3(...mid),
      new THREE.Vector3(...end),
    );
    const pts = curve.getPoints(20);
    geo.setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: LINE_COLOR,
      transparent: true,
      opacity: 0,
    });
    return new THREE.Line(geo, mat);
  }, [start, end]);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.visible = opacity > 0.01;
    (lineObj.material as THREE.LineBasicMaterial).opacity = opacity * 0.5;
  });

  return (
    <group ref={ref}>
      <primitive object={lineObj} />
    </group>
  );
}

function NodeDot({
  position,
  appear,
  progress,
  color = NODE_COLOR,
  size = 0.03,
}: {
  position: [number, number, number];
  appear: number;
  progress: number;
  color?: string;
  size?: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const opacity = smoothstep(appear, appear + 0.05, progress);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.visible = opacity > 0.01;
    ref.current.scale.setScalar(opacity);
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[size, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </mesh>
  );
}

// Pin positions for stages
const DOG_PIN: [number, number, number] = [0, 0.65, 0.3];

const RESOURCE_NODES: { pos: [number, number, number]; label: string }[] = [
  { pos: [-1.2, 0.3, 0.8], label: "NGO" },
  { pos: [1.0, 0.2, -0.5], label: "Vet" },
  { pos: [-0.8, 0.3, -1.0], label: "Volunteer" },
  { pos: [1.3, 0.3, 0.6], label: "Rescuer" },
];

const SCALE_PINS: [number, number, number][] = [
  [-2.5, 0, 1.5],
  [-1.8, 0, -1.8],
  [2.0, 0, -1.2],
  [2.8, 0, 0.8],
  [-0.5, 0, 2.2],
  [1.5, 0, 2.0],
  [-2.2, 0, 0],
  [3.0, 0, -0.3],
  [-1.0, 0, -2.5],
  [0.5, 0, -2.0],
  [2.5, 0, 1.8],
  [-2.8, 0, -1.2],
];

export function NetworkOverlay({ progress }: { progress: number }) {
  return (
    <group>
      {/* Stage: Notice/Report (0.2+) */}
      <Pin position={DOG_PIN} appear={0.18} progress={progress} />

      {/* Stage: Understand (0.35+) */}
      <NodeDot position={[-0.3, 0.1, 0.5]} appear={0.32} progress={progress} color={PIN_COLOR} size={0.02} />
      <NodeDot position={[0.25, 0.15, -0.1]} appear={0.34} progress={progress} color={PIN_COLOR} size={0.02} />
      <NodeDot position={[0.1, 0.05, 0.6]} appear={0.36} progress={progress} color={PIN_COLOR} size={0.02} />

      {/* Stage: Connect (0.5+) */}
      {RESOURCE_NODES.map((n, i) => (
        <NodeDot
          key={n.label}
          position={n.pos}
          appear={0.48 + i * 0.03}
          progress={progress}
          color={NODE_COLOR}
          size={0.04}
        />
      ))}
      {RESOURCE_NODES.map((n, i) => (
        <ConnectionLine
          key={`line-${n.label}`}
          start={DOG_PIN}
          end={n.pos}
          appear={0.52 + i * 0.03}
          progress={progress}
        />
      ))}

      {/* Stage: Act (0.65+) */}
      <ConnectionLine
        start={RESOURCE_NODES[0].pos}
        end={RESOURCE_NODES[1].pos}
        appear={0.65}
        progress={progress}
      />
      <ConnectionLine
        start={RESOURCE_NODES[2].pos}
        end={RESOURCE_NODES[3].pos}
        appear={0.68}
        progress={progress}
      />

      {/* Stage: Scale (0.8+) */}
      {SCALE_PINS.map((pos, i) => (
        <Pin
          key={`scale-${i}`}
          position={pos}
          appear={0.78 + i * 0.012}
          progress={progress}
        />
      ))}
      {/* Scale connection web */}
      {SCALE_PINS.slice(0, 8).map((pos, i) => (
        <ConnectionLine
          key={`scale-line-${i}`}
          start={DOG_PIN}
          end={pos}
          appear={0.82 + i * 0.015}
          progress={progress}
        />
      ))}
    </group>
  );
}
