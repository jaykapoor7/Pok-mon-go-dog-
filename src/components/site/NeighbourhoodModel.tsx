"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type * as THREE from "three";

/** An original, procedural 3D diorama. No remote model or rendering service.
 * The renderer is imported only on this surface, capped on high-DPI phones,
 * and stopped while offscreen. The narrative never depends on WebGL. */
export function NeighbourhoodModel({ progress, reduced }: { progress: number; reduced: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<"street" | "above">("street");
  const state = useRef({ progress, reduced, view });
  const [ready, setReady] = useState(false);
  state.current = { progress, reduced, view };

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let disposed = false;
    let cleanup = () => {};
    import("three").then(T => {
      if (disposed) return;
      let renderer: THREE.WebGLRenderer;
      try { renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" }); }
      catch { return; }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.domElement.setAttribute("aria-hidden", "true");
      container.appendChild(renderer.domElement);
      const scene = new T.Scene();
      const world = new T.Group();
      scene.add(world);
      const camera = new T.PerspectiveCamera(38, 1, .1, 100);
      camera.position.set(11, 12, 16);
      camera.lookAt(0, .6, 0);
      scene.add(new T.HemisphereLight(0xfff8e8, 0x597768, 2.8));
      const sun = new T.DirectionalLight(0xffebc9, 3.2);
      sun.position.set(-5, 12, 8); sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
      sun.shadow.bias = -.001; sun.shadow.normalBias = .025;
      scene.add(sun);
      const materials = new Map<number, THREE.MeshStandardMaterial>();
      const material = (colour: number) => {
        if (!materials.has(colour)) materials.set(colour, new T.MeshStandardMaterial({ color: colour, roughness: .9 }));
        return materials.get(colour)!;
      };
      const cube = new T.BoxGeometry(1, 1, 1);
      const sphere = new T.SphereGeometry(1, 16, 12);
      const leaf = new T.IcosahedronGeometry(1, 1);
      const geometries = new Set<THREE.BufferGeometry>([cube, sphere, leaf]);
      function shape(parent: THREE.Object3D, geometry: THREE.BufferGeometry, colour: number, position: number[], scale = [1, 1, 1]) {
        geometries.add(geometry);
        const mesh = new T.Mesh(geometry, material(colour));
        mesh.position.set(position[0], position[1], position[2]);
        mesh.scale.set(scale[0], scale[1], scale[2]);
        mesh.castShadow = true; mesh.receiveShadow = true;
        parent.add(mesh); return mesh;
      }
      const box = (parent: THREE.Object3D, colour: number, position: number[], scale: number[]) => shape(parent, cube, colour, position, scale);
      const round = (parent: THREE.Object3D, colour: number, position: number[], scale: number[]) => shape(parent, sphere, colour, position, scale);
      box(world, 0xbcc9b3, [0, -.23, 0], [9.6, .45, 7.8]);
      box(world, 0xf2e8cf, [0, .025, 0], [9.55, .08, 7.75]);
      box(world, 0xb6baa8, [0, .09, .75], [9.6, .045, 1.35]);
      box(world, 0xb6baa8, [.65, .09, 0], [1.1, .045, 7.8]);
      for (let x = -4; x < 5; x += 1) box(world, 0xece8d2, [x, .12, .75], [.45, .015, .045]);
      // Each house is a small model: recessed windows, ledges and a roof tank.
      function house(x: number, z: number, w: number, h: number, d: number, colour: number) {
        const g = new T.Group(); g.position.set(x, .12, z); world.add(g);
        box(g, colour, [0, h / 2, 0], [w, h, d]);
        box(g, 0xfff0cf, [0, h + .06, 0], [w + .16, .13, d + .16]);
        box(g, 0xe3ceb0, [0, .07, d / 2 + .1], [w + .12, .14, .24]);
        box(g, 0x355e52, [-w * .23, .45, d / 2 + .01], [.34, .8, .045]);
        for (const wx of [-w * .27, w * .27]) {
          box(g, 0x406a61, [wx, h * .7, d / 2 + .015], [.3, .42, .03]);
          box(g, 0xffedc9, [wx, h * .7 - .25, d / 2 + .05], [.4, .06, .1]);
          box(g, 0xdfd8b9, [wx, h * .7, d / 2 + .04], [.035, .42, .03]);
        }
        shape(g, new T.CylinderGeometry(.19, .2, .29, 16), 0x718978, [w * .25, h + .27, -d * .2]);
        box(g, 0xd6c6a5, [0, h + .15, -d / 2], [w, .2, .07]);
        return g;
      }
      house(-3.35, -2.35, 1.8, 1.9, 1.65, 0xe8b277);
      house(-1.2, -2.5, 1.7, 2.5, 1.4, 0xdd8060);
      house(2.45, -2.35, 2.3, 1.55, 1.55, 0x7f9f87);
      house(3.1, 2.45, 1.7, 1.25, 1.25, 0xe7bb74);
      // A shaded shopfront and a small care station.
      const shop = house(-3.2, 2.65, 1.8, 1.1, 1.25, 0xb9c6a4);
      for (let i = 0; i < 6; i++) box(shop, i % 2 ? 0xf5e6c8 : 0xca6e45, [-.75 + i * .3, .94, .89], [.3, .075, .58]);
      box(world, 0xfff4da, [2.45, 1.2, -1.53], [.48, .48, .04]);
      box(world, 0x44775d, [2.45, 1.2, -1.49], [.3, .08, .04]);
      box(world, 0x44775d, [2.45, 1.2, -1.48], [.08, .3, .04]);
      function tree(x: number, z: number, scale = 1) {
        const g = new T.Group(); g.position.set(x, .1, z); g.scale.setScalar(scale); world.add(g);
        box(g, 0x886247, [0, .5, 0], [.15, 1, .15]);
        shape(g, leaf, 0x426f4e, [0, 1.1, 0], [.6, .75, .6]);
        shape(g, leaf, 0x658b51, [-.22, 1.48, .02], [.47, .53, .45]);
        shape(g, new T.CylinderGeometry(.38, .43, .2, 20), 0xe0be90, [0, .1, 0]);
      }
      tree(-4, -.2, .9); tree(4, -.45, 1.1); tree(1.4, 2.9, .85); tree(-.7, 3.15, .75);
      // Park bench, planter and a bowl: ordinary signs of a shared street.
      box(world, 0x966446, [2.8, .47, -.65], [.85, .1, .3]);
      box(world, 0x966446, [2.8, .7, -.8], [.85, .36, .08]);
      for (const x of [2.5, 3.1]) box(world, 0x41624c, [x, .25, -.65], [.07, .45, .23]);
      shape(world, new T.CylinderGeometry(.19, .14, .12, 20), 0x598d86, [-.85, .18, 1.6]);
      // Stylised Indian street dog, authored here rather than a stock mascot.
      const dog = new T.Group(); dog.position.set(-.45, .12, 1.85); dog.rotation.y = -.45; world.add(dog);
      round(dog, 0xcc7e43, [0, .73, 0], [.6, .32, .27]);
      round(dog, 0xe2a360, [.39, 1.04, 0], [.28, .37, .24]);
      round(dog, 0xe4a76a, [.56, 1.31, 0], [.3, .28, .23]);
      round(dog, 0xf3d2a1, [.81, 1.24, .015], [.24, .14, .17]);
      round(dog, 0x354137, [1, 1.28, .015], [.07, .065, .11]);
      for (const z of [-.17, .17]) {
        round(dog, 0x24372f, [.7, 1.42, z], [.038, .045, .03]);
        const ear = shape(dog, new T.ConeGeometry(.14, .42, 4), 0xa55c35, [.47, 1.66, z]);
        ear.rotation.z = .2; ear.rotation.x = z > 0 ? -.2 : .2;
      }
      const legs: THREE.Mesh[] = [];
      for (const x of [-.37, .34]) for (const z of [-.18, .18]) {
        legs.push(box(dog, 0xd69250, [x, .36, z], [.13, .6, .13]));
        round(dog, 0xf0c995, [x + .05, .1, z], [.14, .08, .1]);
      }
      const tail = new T.Group(); tail.position.set(-.53, .8, 0); dog.add(tail);
      const tailShape = shape(tail, new T.CylinderGeometry(.065, .1, .63, 10), 0xc17940, [-.22, .18, 0]);
      tailShape.rotation.z = -.8;
      // The orange trace belongs to the story, not to live coverage data.
      const trace = new T.Group(); world.add(trace);
      const points = [new T.Vector3(-.4,.15,1.85), new T.Vector3(.65,.15,1.85),new T.Vector3(.65,.15,.7),new T.Vector3(2.45,.15,.7),new T.Vector3(2.45,.15,-1.2)];
      const curve = new T.CatmullRomCurve3(points, false, "catmullrom", .08);
      shape(trace, new T.TubeGeometry(curve, 50, .035, 6, false), 0xdb6e38, [0,0,0]);
      const ring = shape(world, new T.TorusGeometry(.8, .025, 8, 48), 0xd26b35, [-.45,.17,1.85]);
      ring.rotation.x = -Math.PI / 2;
      const pointer = { x: 0, y: 0 };
      let visible = true, frame = 0, last = 0, lastProgress = -1, lastView = "", width = 1, height = 1, yaw = 0, dragging = false, dragX = 0;
      const resize = () => {
        width = container.clientWidth; height = container.clientHeight;
        if (!width || !height) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix(); renderer.setSize(width, height); lastProgress = -1;
      };
      const ro = new ResizeObserver(resize); ro.observe(container); resize();
      const move = (e: PointerEvent) => {
        if (dragging) { yaw = Math.max(-.7, Math.min(.7, yaw + (e.clientX - dragX) * .004)); dragX = e.clientX; lastProgress = -1; }
        if (e.pointerType !== "mouse") return;
        const rect = container.getBoundingClientRect();
        pointer.x = (e.clientX - rect.left) / rect.width - .5;
        pointer.y = (e.clientY - rect.top) / rect.height - .5;
      };
      const down = (e: PointerEvent) => { dragging = true; dragX = e.clientX; container.setPointerCapture(e.pointerId); };
      const up = () => { dragging = false; };
      const leave = () => { pointer.x = 0; pointer.y = 0; dragging = false; };
      container.addEventListener("pointermove", move); container.addEventListener("pointerleave", leave);
      container.addEventListener("pointerdown", down); container.addEventListener("pointerup", up); container.addEventListener("pointercancel", up);
      const render = (now: number) => {
        frame = 0;
        if (disposed || !visible || document.hidden) return;
        frame = requestAnimationFrame(render);
        if (now - last < 32) return;
        last = now;
        const { progress: p, reduced: still, view: currentView } = state.current;
        if (still && p === lastProgress && lastView === currentView) return;
        lastProgress = p; lastView = currentView;
        const aerial = currentView === "above";
        const distance = width < 500 ? 1.3 : 1;
        const target = new T.Vector3((aerial ? 9 : 8 - p * 2) * distance, (aerial ? 13 : 6 + p * 2) * distance, (aerial ? 12 : 12 - p * 1.5) * distance);
        camera.position.lerp(target, still ? 1 : .09);
        camera.lookAt(0, .65, 0);
        world.rotation.y = -.25 + p * .52 + yaw + (still ? 0 : pointer.x * .09);
        world.rotation.x = still ? 0 : pointer.y * .025;
        world.position.y = Math.sin(p * Math.PI) * .14;
        dog.rotation.y = -.45 + p * .3;
        tail.rotation.x = still ? 0 : Math.sin(now * .003) * .35;
        trace.visible = p > .28; trace.scale.setScalar(Math.min(1, Math.max(.001, (p - .28) * 3)));
        ring.scale.setScalar(1 + p * .3);
        renderer.render(scene, camera);
      };
      const start = () => { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(render); };
      const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) start(); else { cancelAnimationFrame(frame); frame = 0; } });
      io.observe(container);
      document.addEventListener("visibilitychange", start);
      const lost = (e: Event) => { e.preventDefault(); setReady(false); cancelAnimationFrame(frame); frame = 0; };
      renderer.domElement.addEventListener("webglcontextlost", lost);
      setReady(true); start();
      cleanup = () => {
        cancelAnimationFrame(frame); io.disconnect(); ro.disconnect();
        document.removeEventListener("visibilitychange", start);
        container.removeEventListener("pointermove", move); container.removeEventListener("pointerleave", leave);
        container.removeEventListener("pointerdown", down); container.removeEventListener("pointerup", up); container.removeEventListener("pointercancel", up);
        renderer.domElement.removeEventListener("webglcontextlost", lost);
        geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
        renderer.dispose(); renderer.domElement.remove();
      };
    }).catch(() => {});
    return () => { disposed = true; cleanup(); };
  }, []);

  return <><div className="neighbour-model" ref={host}>
    {!ready && <Image className="neighbour-model-fallback" src="/field-observation-atlas.png" alt="" fill sizes="(max-width: 760px) 100vw, 55vw"/>}
  </div>{ready && <div className="neighbour-view-controls" role="group" aria-label="3D scene viewpoint">
    <button type="button" aria-pressed={view === "street"} onClick={() => setView("street")}>Street view</button>
    <button type="button" aria-pressed={view === "above"} onClick={() => setView("above")}>From above</button>
    <span>Drag to look around</span>
  </div>}</>;
}
