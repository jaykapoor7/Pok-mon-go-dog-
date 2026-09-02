"use client";

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import './delhi-cinematic.css'

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const smootherstep = (n: number) => {
  const t = clamp01(n)
  return t * t * t * (t * (t * 6 - 15) + 10)
}
const beat = (p: number, a: number, b: number) => smootherstep((p - a) / (b - a))
const damp = (a: number, b: number, lambda: number, dt: number) =>
  THREE.MathUtils.damp(a, b, lambda, dt)

function CameraRig({ progress }: { progress: number }) {
  const { camera } = useThree()
  const targetPosition = useMemo(() => new THREE.Vector3(), [])
  const currentLookAt = useMemo(() => new THREE.Vector3(0, 0, 0), [])
  const targetLookAt = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, dt) => {
    const p = progress
    const enter = beat(p, 0.0, 0.18)
    const reveal = beat(p, 0.12, 0.38)
    const system = beat(p, 0.34, 0.68)
    const connect = beat(p, 0.58, 1.0)

    const x = THREE.MathUtils.lerp(0.35, -1.8, enter)
    const y = THREE.MathUtils.lerp(0.16, 2.8, reveal)
    const z = THREE.MathUtils.lerp(5.2, 9.5, reveal)
    const aerialY = THREE.MathUtils.lerp(y, 10.5, system)
    const aerialZ = THREE.MathUtils.lerp(z, 5.8, system)

    targetPosition.set(
      THREE.MathUtils.lerp(x, 2.0, connect),
      THREE.MathUtils.lerp(aerialY, 3.8, connect),
      THREE.MathUtils.lerp(aerialZ, 7.4, connect),
    )
    targetLookAt.set(
      THREE.MathUtils.lerp(0, 0.2, connect),
      THREE.MathUtils.lerp(0.15, 0.6, system),
      0,
    )

    camera.position.x = damp(camera.position.x, targetPosition.x, 4.5, dt)
    camera.position.y = damp(camera.position.y, targetPosition.y, 4.5, dt)
    camera.position.z = damp(camera.position.z, targetPosition.z, 4.5, dt)
    camera.rotation.z = damp(camera.rotation.z, THREE.MathUtils.lerp(0, -0.34, system), 3.0, dt)
    camera.rotation.x = damp(camera.rotation.x, THREE.MathUtils.lerp(0.03, -0.22, system), 3.0, dt)
    currentLookAt.lerp(targetLookAt, 1 - Math.exp(-5 * dt))
    camera.lookAt(currentLookAt)
    ;(camera as THREE.PerspectiveCamera).fov = damp(
      (camera as THREE.PerspectiveCamera).fov,
      THREE.MathUtils.lerp(58, 74, system),
      3.5,
      dt,
    )
    camera.updateProjectionMatrix()
  })

  return null
}

function StreetPlane({ texture }: { texture: string }) {
  const map = useMemo(() => {
    const loaded = new THREE.TextureLoader().load(texture)
    loaded.colorSpace = THREE.SRGBColorSpace
    return loaded
  }, [texture])

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.22, -1]}>
      <planeGeometry args={[24, 24, 1, 1]} />
      <meshBasicMaterial map={map} color="#9b9a87" transparent opacity={0.94} />
    </mesh>
  )
}

function DogAnchor({ texture, progress }: { texture: string; progress: number }) {
  const ref = useRef<THREE.Mesh>(null!)
  const map = useMemo(() => new THREE.TextureLoader().load(texture), [texture])
  const dogScale = 1.0 + beat(progress, 0.05, 0.24) * 0.7
  const returnToDog = beat(progress, 0.78, 1.0)

  useFrame(({ clock }, dt) => {
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.3) * 0.012
    const targetY = THREE.MathUtils.lerp(0.15, 0.48, returnToDog)
    ref.current.position.y = damp(ref.current.position.y, targetY, 4, dt)
    ref.current.scale.setScalar(dogScale * pulse)
  })

  return (
    <group position={[0, 0, 0]}>
      <mesh ref={ref} position={[0, 0.15, 0.1]} rotation-x={-0.06}>
        <planeGeometry args={[1.8, 2.25]} />
        <meshBasicMaterial map={map} transparent alphaTest={0.04} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 0]}>
        <ringGeometry args={[0.38, 0.42, 64]} />
        <meshBasicMaterial color="#e9ac42" transparent opacity={0.7} />
      </mesh>
    </group>
  )
}

function Route({ progress }: { progress: number }) {
  const pulseRef = useRef<THREE.Mesh>(null!)
  const routeProgress = beat(progress, 0.42, 0.82)
  const points = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.04, 0),
      new THREE.Vector3(1.8, 0.22, -1.5),
      new THREE.Vector3(-2.2, 0.3, -3.6),
      new THREE.Vector3(3.4, 0.6, -5.2),
      new THREE.Vector3(-1.4, 1.0, -7),
    ])
    return curve.getPoints(120)
  }, [])

  const lineMat = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#e9ac42', transparent: true, opacity: 0.1 }),
    [],
  )
  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    return new THREE.Line(geo, lineMat)
  }, [points, lineMat])

  useFrame(({ clock }) => {
    const t = (clock.elapsedTime * 0.12 + routeProgress * 0.8) % 1
    const index = Math.min(points.length - 1, Math.floor(t * (points.length - 1)))
    pulseRef.current.position.copy(points[index])
    pulseRef.current.scale.setScalar(0.8 + Math.sin(clock.elapsedTime * 5) * 0.16)
    lineMat.opacity = 0.08 + routeProgress * 0.78
  })

  return (
    <>
      <primitive object={lineObj} />
      <mesh ref={pulseRef} position={points[0]}>
        <sphereGeometry args={[0.075, 10, 10]} />
        <meshBasicMaterial color="#e9ac42" />
      </mesh>
    </>
  )
}

function MapNodes({ progress }: { progress: number }) {
  const group = useRef<THREE.Group>(null!)
  const nodes = useMemo(() => {
    const values: THREE.Vector3[] = []
    for (let i = 0; i < 34; i++) {
      const angle = i * 2.39996
      const radius = 2 + ((i * 17) % 11) / 3
      values.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0.08 + (i % 5) * 0.05,
        Math.sin(angle) * radius - 2,
      ))
    }
    return values
  }, [])

  useFrame(({ clock }) => {
    const mapReveal = beat(progress, 0.3, 0.64)
    group.current.rotation.y = clock.elapsedTime * 0.015 + mapReveal * 0.4
    group.current.scale.setScalar(0.3 + mapReveal * 0.8)
    group.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.opacity = mapReveal * (0.32 + ((i * 13) % 7) / 12)
      mesh.scale.setScalar(0.7 + Math.sin(clock.elapsedTime * 1.8 + i) * 0.18)
    })
  })

  return (
    <group ref={group}>
      {nodes.map((position, index) => (
        <mesh key={index} position={position}>
          <sphereGeometry args={[0.055, 8, 8]} />
          <meshBasicMaterial
            color={index % 4 === 0 ? '#e9ac42' : '#a8ddd0'}
            transparent
            opacity={0}
          />
        </mesh>
      ))}
    </group>
  )
}

function Scene({
  progress,
  dogTexture,
  streetTexture,
}: {
  progress: number
  dogTexture: string
  streetTexture: string
}) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0.35, 0.16, 5.2], fov: 58, near: 0.01, far: 100 }}
    >
      <color attach="background" args={['#0d1721']} />
      <fog attach="fog" args={['#0d1721', 6, 28]} />
      <CameraRig progress={progress} />
      <ambientLight intensity={0.7} color="#b9c8c2" />
      <pointLight position={[0, 3, 2]} intensity={3.2} color="#e9ac42" distance={12} />
      <StreetPlane texture={streetTexture} />
      <DogAnchor texture={dogTexture} progress={progress} />
      <Route progress={progress} />
      <MapNodes progress={progress} />
    </Canvas>
  )
}

export type DelhiCinematicProps = {
  dogTexture?: string
  streetTexture?: string
  onConnection?: () => void
  className?: string
}

export function DelhiCinematic({
  dogTexture = '/dog-anchor.webp',
  streetTexture = '/delhi-street.webp',
  onConnection,
  className = '',
}: DelhiCinematicProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const firedRef = useRef(false)
  const [progress, setProgress] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])

  useEffect(() => {
    let frame = 0
    const tick = () => {
      const section = sectionRef.current
      if (!section) return
      const rect = section.getBoundingClientRect()
      const scrollable = Math.max(1, rect.height - window.innerHeight)
      const next = clamp01(-rect.top / scrollable)
      setProgress(next)
      if (next > 0.8 && !firedRef.current) {
        firedRef.current = true
        onConnection?.()
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [onConnection])

  const p = reducedMotion ? (progress > 0.4 ? 1 : 0) : progress
  const mapVisible = p > 0.28
  const networkVisible = p > 0.58
  const label =
    p < 0.24
      ? 'ONE SIGHTING'
      : p < 0.42
      ? 'THE SCALE'
      : p < 0.58
      ? 'REPORTS / RESOURCES / GAPS'
      : p < 0.78
      ? 'ONE REPORT / ONE CONNECTION / ONE RESCUE'
      : 'FIND / CONNECT / ACT'

  return (
    <section
      ref={sectionRef}
      className={`delhi-cinematic-section ${className}`}
      aria-label="StrayPaw Delhi cinematic world"
    >
      <div className="delhi-cinematic-sticky">
        <div className="delhi-canvas">
          <Scene progress={p} dogTexture={dogTexture} streetTexture={streetTexture} />
        </div>

        <div className="cinematic-vignette" />
        <div className="cinematic-grain" />

        <div className="cinematic-hud" aria-hidden="true">
          <div className="hud-topline">
            <span>STRAYPAW / DELHI</span>
            <span>{mapVisible ? 'MAP LAYER ACTIVE' : 'SIGNAL ACQUIRED'}</span>
          </div>
          <div className={`hud-stage${networkVisible ? ' is-bright' : ''}`}>{label}</div>
          <div className="hud-bottomline">
            <span>28.7041° N / 77.1025° E</span>
            <span>{String(Math.round(p * 100)).padStart(3, '0')}%</span>
          </div>
          <div className="hud-crosshair" />
        </div>

        <div className="cinematic-accessible-copy">
          <h2>StrayPaw: digital infrastructure for street animals.</h2>
          <p>From one sighting to a connected system of help across Delhi.</p>
        </div>
      </div>
    </section>
  )
}

export default DelhiCinematic
