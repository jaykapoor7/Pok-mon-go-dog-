"use client";

import { Suspense, useRef, useEffect, useCallback, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { DogModel } from "./DogModel";
import { NetworkOverlay } from "./NetworkOverlay";

function CameraRig({ scrollProgress }: { scrollProgress: number }) {
  const { camera } = useThree();

  useEffect(() => {
    const p = scrollProgress;
    const startPos = { x: 0, y: 0.4, z: 3.2 };
    const endPos = { x: -0.5, y: 4, z: 7 };

    camera.position.x = startPos.x + (endPos.x - startPos.x) * p;
    camera.position.y = startPos.y + (endPos.y - startPos.y) * Math.pow(p, 0.7);
    camera.position.z = startPos.z + (endPos.z - startPos.z) * Math.pow(p, 0.5);

    const lookY = 0.1 + p * 0.5;
    const lookX = 0.3 * (1 - p);
    camera.lookAt(lookX, lookY, 0);
  }, [camera, scrollProgress]);

  return null;
}

interface HeroCanvasProps {
  scrollProgress: number;
  className?: string;
}

export function HeroCanvas({ scrollProgress, className = "" }: HeroCanvasProps) {
  const mouse = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    mouse.current = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: ((e.clientY - rect.top) / rect.height) * 2 - 1,
    };
  }, []);

  if (reducedMotion) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="mx-auto h-32 w-32 rounded-full bg-paw-500/20" />
          <p className="mt-4 text-sm text-bark-400">3D scene paused (reduced motion)</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      onPointerMove={handlePointerMove}
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.4, 3.2], fov: 40, near: 0.1, far: 50 }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: true,
        }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <CameraRig scrollProgress={scrollProgress} />

          <ambientLight intensity={0.3} color="#f0e6d8" />
          <directionalLight position={[3, 6, 4]} intensity={1.8} color="#ffecd2" />
          <directionalLight position={[-4, 2, 2]} intensity={0.6} color="#b8d4f0" />
          <directionalLight position={[0, 4, -5]} intensity={0.9} color="#ffd4a8" />
          <directionalLight position={[0, -2, 2]} intensity={0.2} color="#d4c8b8" />

          <group position={[1.3, 0, 0.3]} rotation={[0, -0.75, 0]}>
            <DogModel mouse={mouse} scrollProgress={scrollProgress} />
          </group>

          <NetworkOverlay progress={scrollProgress} />

          <ContactShadows
            position={[0, -0.6, 0]}
            opacity={0.25}
            scale={12}
            blur={3}
            far={3}
            color="#1a1510"
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
