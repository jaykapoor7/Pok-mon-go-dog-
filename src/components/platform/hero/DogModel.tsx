"use client";

import { useRef, useMemo, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Procedural street-dog with behavior state machine.                */
/*  States: IDLE, WALK (pacing), LIE_DOWN, LOOK_UP                   */
/*  Placeholder for a real GLB model.                                 */
/* ------------------------------------------------------------------ */

const COAT = "#a89272";
const COAT_DK = "#8d7a5e";
const BELLY_C = "#bfae94";
const DARK = "#2e2419";
const BOWL_C = "#6b7d8a";
const WATER_C = "#6bb8d4";

function mat(color: string, r = 0.94) {
  return new THREE.MeshStandardMaterial({
    color, roughness: r, metalness: 0.02, flatShading: true,
  });
}

const enum State { IDLE, WALK, LIE_DOWN, LOOK_UP }

const STATE_DURATIONS: Record<State, [number, number]> = {
  [State.IDLE]:     [5, 8],
  [State.WALK]:     [4, 6],
  [State.LIE_DOWN]: [6, 9],
  [State.LOOK_UP]:  [3, 5],
};

const STATE_ORDER: State[] = [
  State.IDLE, State.WALK, State.IDLE, State.LIE_DOWN,
  State.IDLE, State.LOOK_UP, State.IDLE, State.WALK,
  State.IDLE, State.LIE_DOWN, State.IDLE, State.LOOK_UP,
];

function randRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export interface DogModelProps {
  mouse: React.RefObject<{ x: number; y: number }>;
  scrollProgress?: number;
}

export function DogModel({ mouse }: DogModelProps) {
  const head = useRef<THREE.Group>(null!);
  const neck = useRef<THREE.Mesh>(null!);
  const body = useRef<THREE.Group>(null!);
  const tail = useRef<THREE.Group>(null!);
  const earL = useRef<THREE.Group>(null!);
  const earR = useRef<THREE.Group>(null!);
  const eyeL = useRef<THREE.Mesh>(null!);
  const eyeR = useRef<THREE.Mesh>(null!);
  const root = useRef<THREE.Group>(null!);
  const inner = useRef<THREE.Group>(null!);
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
    bowl: mat(BOWL_C, 0.6),
    water: new THREE.MeshStandardMaterial({
      color: WATER_C, roughness: 0.15, metalness: 0.1,
      transparent: true, opacity: 0.7, flatShading: true,
    }),
  }), []);

  const blink = useRef({ t: 0, next: 3 + Math.random() * 3 });
  const earTw = useRef({ t: 0, next: 4 + Math.random() * 5 });
  const tiltR = useRef({ t: 0, next: 6 + Math.random() * 8, d: 1 });

  const state = useRef({
    current: State.IDLE as State,
    idx: 0,
    timer: 0,
    duration: randRange(5, 8),
    transition: 1,
    walkPhase: 0,
    paceAngle: 0,
    paceDir: 1,
  });

  const pose = useRef({
    bodyY: 0,
    bodyTilt: 0,
    headPitch: 0,
    headYaw: 0,
    legFLx: 0, legFRx: 0, legBLx: 0, legBRx: 0,
    legFLy: 0, legFRy: 0, legBLy: 0, legBRy: 0,
    rootY: 0,
    rootRotY: 0,
    tailSpeed: 1,
    tailAmplitude: 0.1,
  });

  const lrp = useCallback((a: number, b: number, f: number) => a + (b - a) * f, []);

  useFrame((_, dt) => {
    const mo = mouse.current ?? { x: 0, y: 0 };
    const now = performance.now();
    const s = state.current;
    const p = pose.current;

    // State machine
    s.timer += dt;
    if (s.timer >= s.duration) {
      s.timer = 0;
      s.idx = (s.idx + 1) % STATE_ORDER.length;
      s.current = STATE_ORDER[s.idx];
      const [mn, mx] = STATE_DURATIONS[s.current];
      s.duration = randRange(mn, mx);
      s.transition = 0;
      if (s.current === State.WALK) {
        s.paceDir = Math.random() > 0.5 ? 1 : -1;
      }
    }
    s.transition = Math.min(1, s.transition + dt * 1.2);
    const t = s.transition * s.transition * (3 - 2 * s.transition); // smoothstep

    // Compute target poses per state
    let tBodyY = 0, tBodyTilt = 0, tHeadPitch = 0;
    let tRootY = 0, tRootRotY = 0;
    let tTailSpeed = 1, tTailAmp = 0.1;
    let walkActive = false;
    let lieDown = false;

    switch (s.current) {
      case State.IDLE:
        tBodyY = 0; tBodyTilt = 0; tHeadPitch = 0;
        tRootY = 0; tRootRotY = 0;
        tTailSpeed = 1; tTailAmp = 0.1;
        break;

      case State.WALK:
        walkActive = true;
        tBodyY = Math.sin(s.walkPhase * 2) * 0.008;
        tBodyTilt = Math.sin(s.walkPhase) * 0.02;
        tRootRotY = s.paceAngle;
        tTailSpeed = 2; tTailAmp = 0.18;
        break;

      case State.LIE_DOWN:
        lieDown = true;
        tBodyY = -0.14;
        tBodyTilt = 0.05;
        tHeadPitch = -0.15;
        tRootY = -0.08;
        tTailSpeed = 0.3; tTailAmp = 0.04;
        break;

      case State.LOOK_UP:
        tBodyY = 0;
        tHeadPitch = -0.35;
        tTailSpeed = 2.5; tTailAmp = 0.22;
        break;
    }

    // Walk cycle phase
    if (walkActive) {
      s.walkPhase += dt * 5;
      s.paceAngle += s.paceDir * dt * 0.25;
      if (Math.abs(s.paceAngle) > 0.6) s.paceDir *= -1;
    }

    // Lerp all pose values toward targets
    const poseRate = 0.04;
    p.bodyY = lrp(p.bodyY, tBodyY, poseRate);
    p.bodyTilt = lrp(p.bodyTilt, tBodyTilt, poseRate);
    p.headPitch = lrp(p.headPitch, tHeadPitch, poseRate);
    p.rootY = lrp(p.rootY, tRootY, poseRate);
    p.rootRotY = lrp(p.rootRotY, tRootRotY, poseRate);
    p.tailSpeed = lrp(p.tailSpeed, tTailSpeed, 0.03);
    p.tailAmplitude = lrp(p.tailAmplitude, tTailAmp, 0.03);

    // Leg targets
    if (walkActive) {
      const ph = s.walkPhase;
      p.legFLx = lrp(p.legFLx, Math.sin(ph) * 0.35, 0.12);
      p.legFRx = lrp(p.legFRx, Math.sin(ph + Math.PI) * 0.35, 0.12);
      p.legBLx = lrp(p.legBLx, Math.sin(ph + Math.PI) * 0.3, 0.12);
      p.legBRx = lrp(p.legBRx, Math.sin(ph) * 0.3, 0.12);
      p.legFLy = lrp(p.legFLy, 0, 0.05);
      p.legFRy = lrp(p.legFRy, 0, 0.05);
      p.legBLy = lrp(p.legBLy, 0, 0.05);
      p.legBRy = lrp(p.legBRy, 0, 0.05);
    } else if (lieDown) {
      p.legFLx = lrp(p.legFLx, 0.6, 0.04);
      p.legFRx = lrp(p.legFRx, 0.6, 0.04);
      p.legBLx = lrp(p.legBLx, -0.5, 0.04);
      p.legBRx = lrp(p.legBRx, -0.5, 0.04);
      p.legFLy = lrp(p.legFLy, -0.06, 0.04);
      p.legFRy = lrp(p.legFRy, -0.06, 0.04);
      p.legBLy = lrp(p.legBLy, -0.04, 0.04);
      p.legBRy = lrp(p.legBRy, -0.04, 0.04);
    } else {
      const idleLeg = Math.sin(now * 0.0008) * 0.012;
      p.legFLx = lrp(p.legFLx, idleLeg, 0.05);
      p.legFRx = lrp(p.legFRx, -idleLeg * 0.5, 0.05);
      p.legBLx = lrp(p.legBLx, idleLeg * 0.5, 0.05);
      p.legBRx = lrp(p.legBRx, -idleLeg, 0.05);
      p.legFLy = lrp(p.legFLy, 0, 0.05);
      p.legFRy = lrp(p.legFRy, 0, 0.05);
      p.legBLy = lrp(p.legBLy, 0, 0.05);
      p.legBRy = lrp(p.legBRy, 0, 0.05);
    }

    // Apply root
    if (root.current) {
      root.current.rotation.y = lrp(root.current.rotation.y, p.rootRotY + mo.x * 0.04, 0.025);
    }
    if (inner.current) {
      inner.current.position.y = p.rootY + p.bodyY;
    }

    // Head: cursor tracking + state pitch
    if (head.current) {
      const cursorInfluence = s.current === State.LIE_DOWN ? 0.5 : 1;
      head.current.rotation.y = lrp(head.current.rotation.y, mo.x * 0.35 * cursorInfluence, 0.06);
      head.current.rotation.x = lrp(
        head.current.rotation.x,
        p.headPitch + (-mo.y * 0.18 * cursorInfluence),
        0.06,
      );
      tiltR.current.t += dt;
      if (tiltR.current.t > tiltR.current.next) {
        tiltR.current.t = 0; tiltR.current.next = 5 + Math.random() * 8; tiltR.current.d *= -1;
      }
      const tv = tiltR.current.t < 1.5 ? tiltR.current.d * 0.07 : 0;
      head.current.rotation.z = lrp(head.current.rotation.z, tv, 0.03);
    }

    // Body breathing
    if (body.current) {
      const brRate = lieDown ? 0.0012 : 0.0017;
      const brAmp = lieDown ? 0.012 : 0.008;
      const br = 1 + Math.sin(now * brRate) * brAmp;
      body.current.scale.set(1, br, 1);
      body.current.rotation.x = p.bodyTilt;
    }

    // Neck follows body tilt
    if (neck.current) {
      neck.current.rotation.x = 0.5 + p.bodyTilt * 0.5;
    }

    // Tail
    if (tail.current) {
      const att = 1 - Math.min(1, Math.sqrt(mo.x * mo.x + mo.y * mo.y));
      tail.current.rotation.z = Math.sin(now * (0.003 * p.tailSpeed + att * 0.004))
        * (p.tailAmplitude + att * 0.08);
      tail.current.rotation.x = -0.25 + Math.sin(now * 0.002) * 0.03;
    }

    // Blink (more frequent when looking up)
    blink.current.t += dt;
    const blinkInterval = s.current === State.LOOK_UP ? 1.5 : 3;
    if (blink.current.t > blink.current.next) {
      blink.current.t = 0;
      blink.current.next = blinkInterval + Math.random() * blinkInterval;
    }
    const bs = blink.current.t < 0.12 ? 0.08 : 1;
    if (eyeL.current) eyeL.current.scale.y = lrp(eyeL.current.scale.y, bs, 0.35);
    if (eyeR.current) eyeR.current.scale.y = lrp(eyeR.current.scale.y, bs, 0.35);

    // Ears
    earTw.current.t += dt;
    if (earTw.current.t > earTw.current.next) {
      earTw.current.t = 0; earTw.current.next = 3 + Math.random() * 5;
    }
    const eTw = earTw.current.t < 0.25 ? Math.sin(earTw.current.t * 28) * 0.1 : 0;
    const earFlat = lieDown ? -0.15 : 0;
    if (earL.current) earL.current.rotation.z = -0.22 + eTw + earFlat;
    if (earR.current) earR.current.rotation.z = 0.22 - eTw - earFlat;

    // Legs
    if (legFL.current) { legFL.current.rotation.x = p.legFLx; legFL.current.position.y = 0.26 + p.legFLy; }
    if (legFR.current) { legFR.current.rotation.x = p.legFRx; legFR.current.position.y = 0.26 + p.legFRy; }
    if (legBL.current) { legBL.current.rotation.x = p.legBLx; legBL.current.position.y = 0.25 + p.legBLy; }
    if (legBR.current) { legBR.current.rotation.x = p.legBRx; legBR.current.position.y = 0.25 + p.legBRy; }
  });

  return (
    <group ref={root} position={[0, -0.38, 0]} scale={1.05}>
      <group ref={inner}>
        {/* ── TORSO ── */}
        <group ref={body}>
          <mesh material={m.coat} position={[0, 0.5, 0.04]} scale={[0.72, 0.78, 0.88]}>
            <sphereGeometry args={[0.18, 10, 10]} />
          </mesh>
          <mesh material={m.coat} position={[0, 0.49, -0.1]} scale={[0.68, 0.72, 0.82]}>
            <sphereGeometry args={[0.17, 10, 10]} />
          </mesh>
          <mesh material={m.coat} position={[0, 0.52, 0.14]} scale={[0.74, 0.8, 0.68]}>
            <sphereGeometry args={[0.16, 10, 10]} />
          </mesh>
          <mesh material={m.coat} position={[0, 0.48, -0.2]} scale={[0.66, 0.74, 0.62]}>
            <sphereGeometry args={[0.17, 10, 10]} />
          </mesh>
          <mesh material={m.dk} position={[0, 0.58, -0.03]} scale={[0.3, 0.25, 0.9]}>
            <capsuleGeometry args={[0.06, 0.25, 3, 6]} />
          </mesh>
          <mesh material={m.belly} position={[0, 0.4, -0.02]} scale={[0.5, 0.35, 0.75]}>
            <sphereGeometry args={[0.14, 8, 8]} />
          </mesh>
        </group>

        {/* ── NECK ── */}
        <mesh ref={neck} material={m.coat} position={[0, 0.62, 0.2]} rotation={[0.5, 0, 0]} scale={[0.48, 0.85, 0.44]}>
          <capsuleGeometry args={[0.07, 0.16, 4, 8]} />
        </mesh>

        {/* ── HEAD ── */}
        <group ref={head} position={[0, 0.74, 0.28]}>
          <mesh material={m.coat} scale={[0.7, 0.68, 0.85]}>
            <sphereGeometry args={[0.11, 10, 10]} />
          </mesh>
          <mesh material={m.dk} position={[0, 0.035, 0.04]} scale={[0.62, 0.26, 0.45]}>
            <sphereGeometry args={[0.07, 6, 6]} />
          </mesh>
          <mesh material={m.coat} position={[0, -0.025, 0.08]} scale={[0.4, 0.32, 0.72]}>
            <sphereGeometry args={[0.07, 8, 8]} />
          </mesh>
          <mesh material={m.belly} position={[0, -0.03, 0.12]} scale={[0.32, 0.24, 0.45]}>
            <sphereGeometry args={[0.055, 6, 6]} />
          </mesh>
          <mesh material={m.coat} position={[0, -0.055, 0.045]} scale={[0.32, 0.16, 0.5]}>
            <sphereGeometry args={[0.05, 6, 6]} />
          </mesh>
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

        {/* ── LEGS ── */}
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

      {/* ── WATER BOWL ── sits on the ground near the dog */}
      <group position={[-0.25, 0.01, 0.22]}>
        {/* Bowl body */}
        <mesh material={m.bowl} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.065, 0.05, 0.035, 8]} />
        </mesh>
        {/* Rim */}
        <mesh material={m.bowl} position={[0, 0.015, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.065, 0.006, 6, 8]} />
        </mesh>
        {/* Water surface */}
        <mesh material={m.water} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.055, 8]} />
        </mesh>
      </group>
    </group>
  );
}
