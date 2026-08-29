"use client";

import { useRef, useMemo, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Procedural street-dog: low-poly faceted sculpture style.          */
/*  Placeholder for a real GLB model.                                 */
/* ------------------------------------------------------------------ */

const COAT = "#a89272";
const COAT_DK = "#8d7a5e";
const BELLY_C = "#bfae94";
const DARK = "#2e2419";

function mat(color: string, r = 0.94) {
  return new THREE.MeshStandardMaterial({
    color, roughness: r, metalness: 0.02, flatShading: true,
  });
}

export interface DogModelProps {
  mouse: React.RefObject<{ x: number; y: number }>;
  scrollProgress?: number;
}

export function DogModel({ mouse }: DogModelProps) {
  const head = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const tail = useRef<THREE.Group>(null!);
  const earL = useRef<THREE.Group>(null!);
  const earR = useRef<THREE.Group>(null!);
  const eyeL = useRef<THREE.Mesh>(null!);
  const eyeR = useRef<THREE.Mesh>(null!);
  const root = useRef<THREE.Group>(null!);
  const legFL = useRef<THREE.Group>(null!);
  const legFR = useRef<THREE.Group>(null!);
  const legBL = useRef<THREE.Group>(null!);
  const legBR = useRef<THREE.Group>(null!);

  const m = useMemo(() => ({
    coat: mat(COAT),
    dk: mat(COAT_DK),
    belly: mat(BELLY_C),
    dark: mat(DARK, 0.7),
    nose: mat("#1a1410", 0.5),
  }), []);

  const blink = useRef({ t: 0, next: 3 + Math.random() * 3 });
  const earTw = useRef({ t: 0, next: 4 + Math.random() * 5 });
  const tiltR = useRef({ t: 0, next: 6 + Math.random() * 8, d: 1 });

  const lrp = useCallback((a: number, b: number, f: number) => a + (b - a) * f, []);

  useFrame((_, dt) => {
    const mo = mouse.current ?? { x: 0, y: 0 };
    const now = performance.now();

    if (head.current) {
      head.current.rotation.y = lrp(head.current.rotation.y, mo.x * 0.35, 0.06);
      head.current.rotation.x = lrp(head.current.rotation.x, -mo.y * 0.18, 0.06);
      tiltR.current.t += dt;
      if (tiltR.current.t > tiltR.current.next) {
        tiltR.current.t = 0; tiltR.current.next = 5 + Math.random() * 8; tiltR.current.d *= -1;
      }
      const tv = tiltR.current.t < 1.5 ? tiltR.current.d * 0.07 : 0;
      head.current.rotation.z = lrp(head.current.rotation.z, tv, 0.03);
    }

    if (body.current) {
      const br = 1 + Math.sin(now * 0.0017) * 0.008;
      body.current.scale.set(1, br, 1);
    }

    if (tail.current) {
      const att = 1 - Math.min(1, Math.sqrt(mo.x * mo.x + mo.y * mo.y));
      tail.current.rotation.z = Math.sin(now * (0.003 + att * 0.004)) * (0.1 + att * 0.14);
      tail.current.rotation.x = -0.25 + Math.sin(now * 0.002) * 0.03;
    }

    blink.current.t += dt;
    if (blink.current.t > blink.current.next) { blink.current.t = 0; blink.current.next = 2 + Math.random() * 4; }
    const bs = blink.current.t < 0.12 ? 0.08 : 1;
    if (eyeL.current) eyeL.current.scale.y = lrp(eyeL.current.scale.y, bs, 0.35);
    if (eyeR.current) eyeR.current.scale.y = lrp(eyeR.current.scale.y, bs, 0.35);

    earTw.current.t += dt;
    if (earTw.current.t > earTw.current.next) { earTw.current.t = 0; earTw.current.next = 3 + Math.random() * 5; }
    const eTw = earTw.current.t < 0.25 ? Math.sin(earTw.current.t * 28) * 0.1 : 0;
    if (earL.current) earL.current.rotation.z = -0.22 + eTw;
    if (earR.current) earR.current.rotation.z = 0.22 - eTw;

    const lp = Math.sin(now * 0.0008) * 0.012;
    if (legFL.current) legFL.current.rotation.x = lp;
    if (legBR.current) legBR.current.rotation.x = -lp;
    if (legFR.current) legFR.current.rotation.x = -lp * 0.5;
    if (legBL.current) legBL.current.rotation.x = lp * 0.5;

    if (root.current) root.current.rotation.y = lrp(root.current.rotation.y, mo.x * 0.04, 0.02);
  });

  return (
    <group ref={root} position={[0, -0.38, 0]} scale={1.05}>
      {/* ── TORSO ── built from overlapping spheres, no single cylinder */}
      <group ref={body}>
        {/* Ribcage (front-center) */}
        <mesh material={m.coat} position={[0, 0.5, 0.04]} scale={[0.72, 0.78, 0.88]}>
          <sphereGeometry args={[0.18, 10, 10]} />
        </mesh>
        {/* Mid-body */}
        <mesh material={m.coat} position={[0, 0.49, -0.1]} scale={[0.68, 0.72, 0.82]}>
          <sphereGeometry args={[0.17, 10, 10]} />
        </mesh>
        {/* Shoulder */}
        <mesh material={m.coat} position={[0, 0.52, 0.14]} scale={[0.74, 0.8, 0.68]}>
          <sphereGeometry args={[0.16, 10, 10]} />
        </mesh>
        {/* Hip */}
        <mesh material={m.coat} position={[0, 0.48, -0.2]} scale={[0.66, 0.74, 0.62]}>
          <sphereGeometry args={[0.17, 10, 10]} />
        </mesh>
        {/* Spine ridge */}
        <mesh material={m.dk} position={[0, 0.58, -0.03]} scale={[0.3, 0.25, 0.9]}>
          <capsuleGeometry args={[0.06, 0.25, 3, 6]} />
        </mesh>
        {/* Belly */}
        <mesh material={m.belly} position={[0, 0.4, -0.02]} scale={[0.5, 0.35, 0.75]}>
          <sphereGeometry args={[0.14, 8, 8]} />
        </mesh>
      </group>

      {/* ── NECK ── */}
      <mesh material={m.coat} position={[0, 0.62, 0.2]} rotation={[0.5, 0, 0]} scale={[0.48, 0.85, 0.44]}>
        <capsuleGeometry args={[0.07, 0.16, 4, 8]} />
      </mesh>

      {/* ── HEAD ── */}
      <group ref={head} position={[0, 0.74, 0.28]}>
        <mesh material={m.coat} scale={[0.7, 0.68, 0.85]}>
          <sphereGeometry args={[0.11, 10, 10]} />
        </mesh>
        {/* Brow */}
        <mesh material={m.dk} position={[0, 0.035, 0.04]} scale={[0.62, 0.26, 0.45]}>
          <sphereGeometry args={[0.07, 6, 6]} />
        </mesh>
        {/* Snout */}
        <mesh material={m.coat} position={[0, -0.025, 0.08]} scale={[0.4, 0.32, 0.72]}>
          <sphereGeometry args={[0.07, 8, 8]} />
        </mesh>
        {/* Muzzle */}
        <mesh material={m.belly} position={[0, -0.03, 0.12]} scale={[0.32, 0.24, 0.45]}>
          <sphereGeometry args={[0.055, 6, 6]} />
        </mesh>
        {/* Jaw */}
        <mesh material={m.coat} position={[0, -0.055, 0.045]} scale={[0.32, 0.16, 0.5]}>
          <sphereGeometry args={[0.05, 6, 6]} />
        </mesh>
        {/* Nose */}
        <mesh material={m.nose} position={[0, -0.022, 0.14]}>
          <sphereGeometry args={[0.016, 6, 6]} />
        </mesh>

        {/* Eyes */}
        <mesh ref={eyeL} material={m.dark} position={[-0.04, 0.012, 0.082]}>
          <sphereGeometry args={[0.014, 6, 6]} />
        </mesh>
        <mesh position={[-0.035, 0.017, 0.09]}>
          <sphereGeometry args={[0.004, 4, 4]} />
          <meshBasicMaterial color="#fff" />
        </mesh>
        <mesh ref={eyeR} material={m.dark} position={[0.04, 0.012, 0.082]}>
          <sphereGeometry args={[0.014, 6, 6]} />
        </mesh>
        <mesh position={[0.035, 0.017, 0.09]}>
          <sphereGeometry args={[0.004, 4, 4]} />
          <meshBasicMaterial color="#fff" />
        </mesh>

        {/* Ears */}
        <group ref={earL} position={[-0.055, 0.09, -0.012]} rotation={[0.12, -0.1, -0.22]}>
          <mesh material={m.coat}><coneGeometry args={[0.032, 0.13, 4]} /></mesh>
          <mesh material={m.dark} position={[0.004, -0.01, 0.008]} scale={[0.45, 0.55, 0.25]}>
            <coneGeometry args={[0.025, 0.08, 3]} />
          </mesh>
        </group>
        <group ref={earR} position={[0.055, 0.09, -0.012]} rotation={[0.12, 0.1, 0.22]}>
          <mesh material={m.coat}><coneGeometry args={[0.032, 0.13, 4]} /></mesh>
          <mesh material={m.dark} position={[-0.004, -0.01, 0.008]} scale={[0.45, 0.55, 0.25]}>
            <coneGeometry args={[0.025, 0.08, 3]} />
          </mesh>
        </group>
      </group>

      {/* ── LEGS ── raised to overlap body underside */}
      {/* Front left */}
      <group ref={legFL} position={[-0.06, 0.26, 0.1]}>
        <mesh material={m.coat} position={[0, 0.08, 0]} scale={[1.2, 0.8, 1.1]}>
          <sphereGeometry args={[0.035, 6, 6]} />
        </mesh>
        <mesh material={m.coat}>
          <capsuleGeometry args={[0.022, 0.24, 3, 6]} />
        </mesh>
        <mesh material={m.belly} position={[0, -0.15, 0.004]}>
          <sphereGeometry args={[0.026, 5, 5]} />
        </mesh>
      </group>
      {/* Front right */}
      <group ref={legFR} position={[0.06, 0.26, 0.1]}>
        <mesh material={m.coat} position={[0, 0.08, 0]} scale={[1.2, 0.8, 1.1]}>
          <sphereGeometry args={[0.035, 6, 6]} />
        </mesh>
        <mesh material={m.coat}>
          <capsuleGeometry args={[0.022, 0.24, 3, 6]} />
        </mesh>
        <mesh material={m.belly} position={[0, -0.15, 0.004]}>
          <sphereGeometry args={[0.026, 5, 5]} />
        </mesh>
      </group>
      {/* Back left */}
      <group ref={legBL} position={[-0.06, 0.25, -0.16]}>
        <mesh material={m.coat} position={[0, 0.08, 0]} scale={[1.15, 0.8, 1.1]}>
          <sphereGeometry args={[0.038, 6, 6]} />
        </mesh>
        <mesh material={m.coat}>
          <capsuleGeometry args={[0.024, 0.22, 3, 6]} />
        </mesh>
        <mesh material={m.belly} position={[0, -0.14, 0.004]}>
          <sphereGeometry args={[0.028, 5, 5]} />
        </mesh>
      </group>
      {/* Back right */}
      <group ref={legBR} position={[0.06, 0.25, -0.16]}>
        <mesh material={m.coat} position={[0, 0.08, 0]} scale={[1.15, 0.8, 1.1]}>
          <sphereGeometry args={[0.038, 6, 6]} />
        </mesh>
        <mesh material={m.coat}>
          <capsuleGeometry args={[0.024, 0.22, 3, 6]} />
        </mesh>
        <mesh material={m.belly} position={[0, -0.14, 0.004]}>
          <sphereGeometry args={[0.028, 5, 5]} />
        </mesh>
      </group>

      {/* ── TAIL ── */}
      <group ref={tail} position={[0, 0.56, -0.3]} rotation={[-0.15, 0, 0]}>
        <mesh material={m.dk}><capsuleGeometry args={[0.012, 0.14, 3, 6]} /></mesh>
        <mesh material={m.dk} position={[0, 0.08, 0.025]} rotation={[0.5, 0, 0]}>
          <capsuleGeometry args={[0.009, 0.09, 3, 6]} />
        </mesh>
        <mesh material={m.dk} position={[0, 0.13, 0.06]} rotation={[0.9, 0, 0]}>
          <capsuleGeometry args={[0.007, 0.06, 3, 6]} />
        </mesh>
      </group>
    </group>
  );
}
