"use client";

import { Component, Suspense, useMemo, useRef, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { Minus, Plus, RotateCcw } from "lucide-react";

/** Peça a desenhar: cor, "material" (para o brilho) e, opcionalmente, foto/modelo cadastrados no painel. */
export type Part = { hex: string; type?: string; image?: string; modelUrl?: string | null };
export type ViewerProps = {
  counts: { beadsMain: number; beadsExtra: number; spacers: number };
  bead?: Part; extraBead?: Part; spacer?: Part; cross?: Part; medal?: Part; charms: Part[];
};

const D = 1; // diâmetro base de uma bolinha

function look(type = "", metalByDefault = false): Partial<THREE.MeshPhysicalMaterialParameters> {
  const t = type.toLowerCase();
  if (/p[ée]rola/.test(t)) return { roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 1, sheenColor: new THREE.Color("#ffffff") };
  if (/cristal|vidro|acr[ií]lic/.test(t)) return { roughness: 0.04, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.82 };
  if (/madeira/.test(t)) return { roughness: 0.75, metalness: 0 };
  if (/metal|ouro|prata|lat[aã]o|a[cç]o/.test(t) || metalByDefault) return { roughness: 0.28, metalness: 1 };
  if (/pedra|[aá]gata|quartzo|olho|jaspe|ametista/.test(t)) return { roughness: 0.32, metalness: 0.05, clearcoat: 0.6 };
  return { roughness: 0.4, metalness: 0.1, clearcoat: 0.3 };
}

function Mat({ part, metal = false }: { part?: Part; metal?: boolean }) {
  const props = useMemo(() => look(part?.type, metal), [part?.type, metal]);
  return <meshPhysicalMaterial color={part?.hex ?? "#d9dee8"} {...props} />;
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* fallback silencioso: usamos a forma padrão */ }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** Modelo .glb cadastrado: centralizado e escalado para caber em `size`. */
function Glb({ url, size }: { url: string; size: number }) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const s = box.getSize(new THREE.Vector3());
    const k = size / Math.max(s.x, s.y, s.z || 1);
    const center = box.getCenter(new THREE.Vector3());
    c.position.sub(center);
    const g = new THREE.Group();
    g.add(c);
    g.scale.setScalar(k);
    return g;
  }, [scene, size]);
  return <primitive object={obj} />;
}

function Bead({ p, part, scale = 1, flat = false }: { p: [number, number, number]; part?: Part; scale?: number; flat?: boolean }) {
  return (
    <mesh position={p} scale={flat ? [scale, scale * 0.72, scale] : scale}>
      <sphereGeometry args={[D / 2, 28, 20]} />
      <Mat part={part} metal={flat} />
    </mesh>
  );
}

function CrossShape({ part }: { part?: Part }) {
  return (
    <group>
      <mesh><boxGeometry args={[0.55, 3, 0.32]} /><Mat part={part} metal /></mesh>
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[1.8, 0.55, 0.32]} /><Mat part={part} metal /></mesh>
    </group>
  );
}
function Cross({ part }: { part?: Part }) {
  const shape = <CrossShape part={part} />;
  if (!part?.modelUrl) return shape;
  return <Boundary fallback={shape}><Suspense fallback={shape}><Glb url={part.modelUrl} size={3.2} /></Suspense></Boundary>;
}

function MedalBase({ part, children }: { part?: Part; children?: ReactNode }) {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.95, 0.95, 0.14, 40]} /><Mat part={part} metal /></mesh>
      <mesh><torusGeometry args={[0.95, 0.07, 14, 48]} /><Mat part={part} metal /></mesh>
      {children}
    </group>
  );
}
// Componente separado: useTexture sempre é chamado (sem hook condicional).
function TexturedFace({ url }: { url: string }) {
  const tex = useTexture(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  return <mesh position={[0, 0, 0.081]}><circleGeometry args={[0.82, 40]} /><meshStandardMaterial map={tex} roughness={0.5} /></mesh>;
}
function Medal({ part }: { part?: Part }) {
  const plain = <MedalBase part={part} />;
  if (part?.modelUrl) return <Boundary fallback={plain}><Suspense fallback={plain}><Glb url={part.modelUrl} size={2} /></Suspense></Boundary>;
  if (part?.image) return <Boundary fallback={plain}><Suspense fallback={plain}><MedalBase part={part}><TexturedFace url={part.image} /></MedalBase></Suspense></Boundary>;
  return plain;
}

function Rosary({ counts, bead, extraBead, spacer, cross, medal, charms }: ViewerProps) {
  const layout = useMemo(() => {
    const decades = 5;
    const mainPer = Math.max(0, Math.min(10, Math.floor(counts.beadsMain / decades)));
    const mainTail = Math.max(0, counts.beadsMain - mainPer * decades);
    const extraLoop = Math.min(decades, counts.beadsExtra);
    const extraTail = Math.max(0, counts.beadsExtra - extraLoop);
    const spLoop = Math.min(decades, counts.spacers);
    const spTail = Math.max(0, counts.spacers - spLoop);

    type Item = { kind: "main" | "extra" | "spacer" };
    const loop: Item[] = [];
    for (let d = 0; d < decades; d++) {
      if (d < extraLoop) loop.push({ kind: "extra" });
      for (let i = 0; i < mainPer; i++) loop.push({ kind: "main" });
      if (d < spLoop) loop.push({ kind: "spacer" });
    }
    const L = Math.max(loop.length, 8);
    const R = (L * D * 1.02) / (2 * Math.PI);

    const tail: Item[] = [];
    for (let i = 0; i < extraTail; i++) tail.push({ kind: "extra" });
    for (let i = 0; i < mainTail; i++) tail.push({ kind: "main" });
    for (let i = 0; i < spTail; i++) tail.push({ kind: "spacer" });
    return { loop, tail, L, R };
  }, [counts.beadsMain, counts.beadsExtra, counts.spacers]);

  const { loop, tail, L, R } = layout;
  const partOf = (k: "main" | "extra" | "spacer") => (k === "main" ? bead : k === "extra" ? extraBead ?? bead : spacer);
  const scaleOf = (k: "main" | "extra" | "spacer") => (k === "extra" ? 1.28 : k === "spacer" ? 0.95 : 1);

  const tailStartY = -R - 0.2;
  let y = tailStartY - 1.4; // abaixo da medalha

  return (
    <group position={[0, R * 0.35, 0]}>
      {loop.map((it, i) => {
        const a = -Math.PI / 2 + ((i + 0.5) / L) * Math.PI * 2 * (loop.length / L) + (Math.PI * 2 * (L - loop.length)) / (2 * L);
        return <Bead key={i} p={[Math.cos(a) * R, Math.sin(a) * R, 0]} part={partOf(it.kind)} scale={scaleOf(it.kind)} flat={it.kind === "spacer"} />;
      })}

      <group position={[0, -R - 0.05, 0]}><Medal part={medal} /></group>

      {tail.map((it, i) => {
        const s = scaleOf(it.kind);
        const py = y - (D * s) / 2;
        y -= D * s * 1.02;
        return <Bead key={`t${i}`} p={[0, py, 0]} part={partOf(it.kind)} scale={s} flat={it.kind === "spacer"} />;
      })}

      <group position={[0, y - 1.7, 0]}><Cross part={cross} /></group>

      {charms.slice(0, 6).map((c, i) => (
        <mesh key={i} position={[(i % 2 ? 1 : -1) * (1.2 + Math.floor(i / 2) * 0.55), -R - 1.2 - Math.floor(i / 2) * 0.2, 0.2]}>
          <octahedronGeometry args={[0.38, 0]} />
          <Mat part={c} metal />
        </mesh>
      ))}
    </group>
  );
}

export default function RosaryViewer(props: ViewerProps & { height?: string }) {
  const controls = useRef<React.ComponentRef<typeof OrbitControls> | null>(null);
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;

  const dolly = (k: number) => {
    const c = controls.current as unknown as { object: THREE.Camera; update: () => void } | null;
    if (!c) return;
    c.object.position.multiplyScalar(k);
    c.update();
  };
  const reset = () => (controls.current as unknown as { reset: () => void } | null)?.reset();

  return (
    <div className="relative h-full w-full touch-none select-none" style={{ minHeight: props.height }}>
      <Canvas dpr={mobile ? [1, 1.5] : [1, 2]} camera={{ position: [0, 0, 36], fov: 38 }} gl={{ antialias: true, alpha: true }} aria-label="Visualização 3D do terço" role="img">
        <hemisphereLight args={["#ffffff", "#8aa4c8", 0.9]} />
        <directionalLight position={[8, 12, 14]} intensity={1.6} />
        <directionalLight position={[-10, -6, 8]} intensity={0.6} color="#ffd6ec" />
        {/* Ambiente gerado localmente (sem baixar HDR externo): reflexos nos metais e cristais */}
        <Environment resolution={64}>
          <Lightformer intensity={2} position={[0, 6, 8]} scale={[14, 4, 1]} />
          <Lightformer intensity={1.2} position={[-8, 0, 4]} rotation-y={Math.PI / 2} scale={[10, 6, 1]} color="#bfe4ff" />
          <Lightformer intensity={1.2} position={[8, -2, 4]} rotation-y={-Math.PI / 2} scale={[10, 6, 1]} color="#ffd1e8" />
        </Environment>
        <Rosary {...props} />
        <OrbitControls ref={controls as never} enablePan={false} enableDamping dampingFactor={0.08} minDistance={9} maxDistance={60} autoRotate={!reduce} autoRotateSpeed={1.2} makeDefault />
      </Canvas>
      <div className="absolute bottom-2 right-2 flex gap-1.5">
        {[{ l: "Aproximar", i: <Plus className="h-4 w-4" />, f: () => dolly(0.8) }, { l: "Afastar", i: <Minus className="h-4 w-4" />, f: () => dolly(1.25) }, { l: "Reiniciar visão", i: <RotateCcw className="h-4 w-4" />, f: reset }].map((b) => (
          <button key={b.l} type="button" onClick={b.f} aria-label={b.l} title={b.l} className="grid h-10 w-10 place-items-center rounded-full bg-card/90 text-fg shadow-soft hover:bg-card">{b.i}</button>
        ))}
      </div>
      <p className="pointer-events-none absolute bottom-2 left-3 text-xs font-bold text-fg-2">Arraste para girar · pince para aproximar</p>
    </div>
  );
}
