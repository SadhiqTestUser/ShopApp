import { Suspense, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { type MugMaterial, type MugType } from '@/lib/mugs';
import type { MugConfig } from './mugState';
import type { MugArtwork } from './useMugArtwork';
import { mugRotation, PRINT_START, PRINT_SPAN, PRINT_HEIGHT, type MugAngle } from './mugProjection';

interface Mug3DProps {
  artwork: MugArtwork;
  config: MugConfig;
  mugType: MugType;
  angle: MugAngle;
  autoRotate: boolean;
  onUnavailable: () => void;
}

const R = 1.15; // body radius (units)
const H = 2.75;

// Keep a live CanvasTexture in sync with the design/config (redrawn on edit).
function useMugTexture(artwork: MugArtwork): THREE.CanvasTexture {
  const { invalidate } = useThree();
  const canvas = artwork.canvas;
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [canvas]);
  useEffect(() => {
    texture.needsUpdate = true;
    invalidate();
  }, [texture, artwork.revision, invalidate]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function ContextMonitor({ onUnavailable }: { onUnavailable: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('webglcontextlost', onUnavailable);
    return () => canvas.removeEventListener('webglcontextlost', onUnavailable);
  }, [gl, onUnavailable]);
  return null;
}

// Physically-based surface parameters per mug material. Ceramic bodies use a
// clearcoat glaze over a slightly rough base; matte fiber drops the clearcoat;
// metal/radium adds metalness; glass is handled separately via transmission.
interface Surface { roughness: number; metalness: number; clearcoat: number; clearcoatRoughness: number }
function surfaceFor(m: MugMaterial): Surface {
  switch (m) {
    case 'matte': return { roughness: 0.92, metalness: 0.0, clearcoat: 0.12, clearcoatRoughness: 0.7 };
    case 'metal': return { roughness: 0.3, metalness: 0.85, clearcoat: 0.45, clearcoatRoughness: 0.18 };
    case 'glass': return { roughness: 0.06, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.04 };
    default: return { roughness: 0.42, metalness: 0.02, clearcoat: 1.0, clearcoatRoughness: 0.08 };
  }
}

function Handle({ color, love, surface }: { color: string; love: boolean; surface: Surface }) {
  const geo = useMemo(() => {
    // A solid C-profile, rather than a cut torus. The wider ends extend into
    // the body, with an open grip and a softly rounded ceramic cross-section.
    const shape = new THREE.Shape();
    const join = -0.04; // Bury the bevel in the wall without entering the cup.
    if (love) {
      shape.moveTo(join, 0.76);
      shape.bezierCurveTo(0.10, 0.76, 0.20, 1.05, 0.48, 1.05);
      shape.bezierCurveTo(0.85, 1.05, 1.00, 0.82, 0.97, 0.48);
      shape.bezierCurveTo(0.94, 0.03, 0.48, -0.59, 0.16, -0.90);
      shape.bezierCurveTo(0.05, -0.97, join, -0.94, join, -0.89);
      shape.lineTo(join, -0.55);
      shape.bezierCurveTo(0.07, -0.58, 0.43, -0.16, 0.62, 0.27);
      shape.bezierCurveTo(0.81, 0.69, 0.49, 0.85, 0.28, 0.65);
      shape.bezierCurveTo(0.13, 0.51, join, 0.42, join, 0.43);
    } else {
      shape.moveTo(join, 0.93);
      shape.bezierCurveTo(0.18, 0.94, 0.55, 0.95, 0.76, 0.70);
      shape.bezierCurveTo(1.02, 0.40, 1.02, -0.33, 0.76, -0.64);
      shape.bezierCurveTo(0.52, -0.92, 0.17, -0.94, join, -0.91);
      shape.lineTo(join, -0.56);
      shape.bezierCurveTo(0.15, -0.58, 0.39, -0.54, 0.53, -0.36);
      shape.bezierCurveTo(0.69, -0.14, 0.69, 0.23, 0.54, 0.44);
      shape.bezierCurveTo(0.39, 0.63, 0.15, 0.61, join, 0.60);
    }
    shape.closePath();
    const extruded = new THREE.ExtrudeGeometry(shape, {
      depth: 0.18, steps: 1, curveSegments: 48,
      bevelEnabled: true, bevelThickness: 0.075, bevelSize: 0.055, bevelSegments: 8,
    });
    extruded.translate(R, 0, -0.09);
    // Extrusion duplicates vertices at faces. Weld before computing normals
    // so highlights flow smoothly around the bevel instead of showing facets.
    extruded.deleteAttribute('normal');
    extruded.deleteAttribute('uv');
    const smooth = mergeVertices(extruded);
    smooth.computeVertexNormals();
    extruded.dispose();
    return smooth;
  }, [love]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshPhysicalMaterial
        color={color} roughness={surface.roughness} metalness={surface.metalness}
        clearcoat={surface.clearcoat} clearcoatRoughness={surface.clearcoatRoughness}
        envMapIntensity={1}
      />
    </mesh>
  );
}

function Mug({ artwork, config, mugType, angle }: Omit<Mug3DProps, 'autoRotate' | 'onUnavailable'>) {
  const texture = useMugTexture(artwork);
  const m = mugType.material;
  const bodyColor = mugType.baseColor;
  const interior = m === 'reveal' ? '#0b1220' : '#eef2f7';
  const handleColor = bodyColor;
  const love = mugType.handles.includes('love') && config.handleStyle === 'love';
  const s = surfaceFor(m);

  return (
    <group rotation={[0, mugRotation(angle), 0]}>
      {/* Substrate remains visible at rim, base and the seam by the handle. */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[R, R, H, 96, 1, true]} />
        <meshPhysicalMaterial color={bodyColor} roughness={s.roughness} metalness={s.metalness} clearcoat={s.clearcoat} />
      </mesh>
      {/* Printable sector: u=0 starts just after the handle seam. */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[R + 0.003, R + 0.003, H * PRINT_HEIGHT, 128, 1, true, PRINT_START * Math.PI * 2, PRINT_SPAN * Math.PI * 2]} />
        {m === 'glass' ? (
          <meshPhysicalMaterial
            map={texture} transmission={0.32} thickness={0.6} ior={1.45}
            roughness={0.08} metalness={0} clearcoat={1} clearcoatRoughness={0.04}
            envMapIntensity={1.1} transparent
          />
        ) : (
          <meshPhysicalMaterial
            map={texture} roughness={s.roughness} metalness={s.metalness}
            clearcoat={s.clearcoat} clearcoatRoughness={s.clearcoatRoughness}
            envMapIntensity={1}
          />
        )}
      </mesh>
      {/* Inner wall */}
      <mesh>
        <cylinderGeometry args={[R * 0.9, R * 0.89, H * 0.98, 64, 1, true]} />
        <meshStandardMaterial color={interior} roughness={0.7} side={THREE.BackSide} />
      </mesh>
      {/* Inner floor */}
      <mesh position={[0, -H / 2 + 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[R * 0.9, 64]} />
        <meshStandardMaterial color={interior} roughness={0.85} />
      </mesh>
      {/* Bottom */}
      <mesh position={[0, -H / 2 + 0.03, 0]}>
        <cylinderGeometry args={[R * 0.985, R * 0.9, 0.06, 64]} />
        <meshPhysicalMaterial color={bodyColor} roughness={0.5} metalness={s.metalness} clearcoat={s.clearcoat} clearcoatRoughness={s.clearcoatRoughness} />
      </mesh>
      {/* Top rim */}
      <mesh position={[0, H / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R, R * 0.03, 20, 96]} />
        <meshPhysicalMaterial color={bodyColor} roughness={s.roughness} metalness={s.metalness} clearcoat={s.clearcoat} clearcoatRoughness={s.clearcoatRoughness} />
      </mesh>
      <group rotation={[0, -Math.PI / 2, 0]}>
        <Handle color={handleColor} love={love} surface={s} />
      </group>
    </group>
  );
}

// Compact studio "softbox" environment built from area lights (Lightformers).
// Provides the reflections that make the ceramic glaze read as real, without
// shipping any external HDRI files.
function StudioEnv() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#101014']} />
      <Lightformer intensity={2.2} position={[0, 3, 2]} scale={[6, 3, 1]} color="#ffffff" />
      <Lightformer intensity={1.1} position={[-3, 1, 2]} scale={[3, 4, 1]} color="#dbeafe" />
      <Lightformer intensity={1.1} position={[3, 1, 2]} scale={[3, 4, 1]} color="#fef3c7" />
      <Lightformer intensity={1.4} position={[0, -2, -3]} scale={[6, 3, 1]} rotation={[Math.PI, 0, 0]} color="#ffffff" />
    </Environment>
  );
}

// Real WebGL mug: a textured cylinder with a 3D handle, studio lighting and
// interactive orbit. The artwork updates live via a CanvasTexture.
export default function Mug3D({ artwork, config, mugType, angle, autoRotate, onUnavailable }: Mug3DProps) {
  return (
    <div className="w-full h-[320px] sm:h-[420px]" style={{ touchAction: 'none' }} role="img" aria-label="Interactive 3D mug preview. Drag to rotate and pinch to zoom, or use the angle buttons.">
      <Canvas
        shadows dpr={[1, 1.75]} camera={{ position: [0, 1.25, 8.8], fov: 32 }}
        frameloop={autoRotate ? 'always' : 'demand'}
        fallback={<p className="p-8 text-center text-sm text-slate-600">3D is unavailable on this device. Choose an angle above to continue.</p>}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        <ContextMonitor onUnavailable={onUnavailable} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[4, 6, 5]} intensity={0.9} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0002} />
        <directionalLight position={[-5, 3, -4]} intensity={0.2} />
        <Suspense fallback={null}>
          <StudioEnv />
          <Mug artwork={artwork} config={config} mugType={mugType} angle={angle} />
        </Suspense>
        <ContactShadows position={[0, -H / 2 - 0.02, 0]} opacity={0.35} scale={7} blur={2.6} far={4.5} resolution={512} frames={1} />
        <OrbitControls
          enablePan={false} enableDamping dampingFactor={0.08}
          minDistance={6} maxDistance={12} minPolarAngle={Math.PI * 0.15} maxPolarAngle={Math.PI * 0.75}
          autoRotate={autoRotate} autoRotateSpeed={0.9} target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}
