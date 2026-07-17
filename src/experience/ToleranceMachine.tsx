import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore, smoothRange } from "../lib/experienceStore";
import { ParticleDust } from "./ParticleDust";
import { ScanField } from "./ScanField";

type ToleranceMachineProps = {
  quality: "low" | "high";
};

const coreVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uMotion;
  varying vec3 vNormalWorld;
  varying vec3 vWorldPosition;
  varying float vDisplacement;

  void main() {
    float waveA = sin(position.y * 5.5 + uTime * 0.7 + uProgress * 8.0);
    float waveB = sin(position.x * 7.0 - uTime * 0.45);
    float displacement = (waveA + waveB) * 0.025 * uMotion;
    vec3 transformed = position + normal * displacement;
    vec4 world = modelMatrix * vec4(transformed, 1.0);
    vWorldPosition = world.xyz;
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    vDisplacement = displacement;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const coreFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform vec3 uSignal;
  varying vec3 vNormalWorld;
  varying vec3 vWorldPosition;
  varying float vDisplacement;

  void main() {
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(normalize(vNormalWorld), viewDirection), 0.0), 2.35);
    float latitude = abs(sin(vWorldPosition.y * 28.0 - uTime * 0.28));
    float scan = smoothstep(0.92, 1.0, latitude);
    vec3 base = vec3(0.055, 0.055, 0.05);
    vec3 oxidized = vec3(0.53, 0.61, 0.56);
    vec3 color = mix(base, oxidized, fresnel * 0.65 + vDisplacement * 5.0);
    color = mix(color, uSignal, scan * (0.08 + uProgress * 0.14));
    float alpha = 0.92 + fresnel * 0.08;
    gl_FragColor = vec4(color, alpha);
  }
`;

const ringAngles = [0.18, 1.1, 2.22, 3.15, 4.2, 5.32];

function damp(current: number, target: number, lambda: number, delta: number) {
  return THREE.MathUtils.damp(current, target, lambda, delta);
}

export function ToleranceMachine({ quality }: ToleranceMachineProps) {
  const machine = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const coreMaterial = useRef<THREE.ShaderMaterial>(null);
  const rings = useRef<Array<THREE.Mesh | null>>([]);
  const antennae = useRef<THREE.Group>(null);
  const signalColor = useMemo(() => new THREE.Color("#ff4d00"), []);
  const segments = quality === "high" ? 96 : 48;
  const particles = quality === "high" ? 520 : 180;

  useFrame(({ camera, clock }, delta) => {
    const group = machine.current;
    const coreMesh = core.current;
    if (!group || !coreMesh || !coreMaterial.current) return;

    const progress = experienceStore.progress;
    const motion = experienceStore.reducedMotion ? 0 : 1;
    const chapter = Math.min(5, Math.round(progress * 5));
    const desktopOffsets = [-0.55, -1.2, 1.15, -1.05, 1.12, 0];
    const targetX = experienceStore.isMobile ? 0 : desktopOffsets[chapter];
    const idle = Math.sin(clock.elapsedTime * 0.55) * 0.055 * motion;
    const caseExplode = smoothRange(progress, 0.42, 0.62) * (1 - smoothRange(progress, 0.68, 0.8));
    const transmission = smoothRange(progress, 0.79, 0.98);

    group.position.x = damp(group.position.x, targetX, 2.8, delta);
    group.position.y = damp(
      group.position.y,
      experienceStore.isMobile ? -0.7 : idle,
      3.1,
      delta,
    );
    group.rotation.y = damp(
      group.rotation.y,
      progress * Math.PI * 1.48 + experienceStore.pointerX * 0.11 * motion,
      3.2,
      delta,
    );
    group.rotation.x = damp(
      group.rotation.x,
      -0.16 + Math.sin(progress * Math.PI * 2) * 0.18 + experienceStore.pointerY * 0.06 * motion,
      3.2,
      delta,
    );
    group.rotation.z = damp(group.rotation.z, transmission * Math.PI * 0.5, 3, delta);

    const coreScale = 1 - caseExplode * 0.26 + transmission * 0.12;
    coreMesh.scale.setScalar(damp(coreMesh.scale.x, coreScale, 3.4, delta));
    coreMesh.rotation.y += delta * 0.12 * motion;
    coreMesh.rotation.z -= delta * 0.07 * motion;

    rings.current.forEach((ring, index) => {
      if (!ring) return;
      const angle = ringAngles[index];
      const radial = transmission * (1.35 + index * 0.12);
      const targetRingX = Math.cos(angle) * radial;
      const targetRingY = Math.sin(angle) * radial;
      const targetRingZ = (index - 2.5) * 0.34 * caseExplode;
      ring.position.x = damp(ring.position.x, targetRingX, 3.1, delta);
      ring.position.y = damp(ring.position.y, targetRingY, 3.1, delta);
      ring.position.z = damp(ring.position.z, targetRingZ, 3.1, delta);
      ring.rotation.x = damp(
        ring.rotation.x,
        angle * 0.22 + progress * (0.35 + index * 0.035),
        3,
        delta,
      );
      ring.rotation.y = damp(
        ring.rotation.y,
        angle * 0.16 - progress * (0.22 + index * 0.025),
        3,
        delta,
      );
      ring.rotation.z += delta * (index % 2 === 0 ? 0.055 : -0.045) * motion;
    });

    if (antennae.current) {
      antennae.current.scale.setScalar(0.72 + transmission * 0.55);
      antennae.current.rotation.z = -transmission * Math.PI * 0.5;
    }

    coreMaterial.current.uniforms.uTime.value = clock.elapsedTime;
    coreMaterial.current.uniforms.uProgress.value = progress;
    coreMaterial.current.uniforms.uMotion.value = motion;

    const cameraX = experienceStore.pointerX * 0.18 * motion;
    const cameraY = 0.1 + experienceStore.pointerY * 0.12 * motion;
    const cameraZ = experienceStore.isMobile ? 8.7 : 7.1 - Math.sin(progress * Math.PI) * 0.35;
    camera.position.x = damp(camera.position.x, cameraX, 2.4, delta);
    camera.position.y = damp(camera.position.y, cameraY, 2.4, delta);
    camera.position.z = damp(camera.position.z, cameraZ, 2.4, delta);
    camera.lookAt(0, experienceStore.isMobile ? -0.58 : 0, 0);
  });

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} color="#f5eee0" />
      <pointLight position={[-4, -1, 3]} intensity={15} distance={10} color="#ff4d00" />
      <pointLight position={[3, 1, -3]} intensity={8} distance={8} color="#a8b6ac" />

      <group ref={machine}>
        <mesh ref={core}>
          <icosahedronGeometry args={[1.18, quality === "high" ? 5 : 3]} />
          <shaderMaterial
            ref={coreMaterial}
            vertexShader={coreVertexShader}
            fragmentShader={coreFragmentShader}
            uniforms={{
              uTime: { value: 0 },
              uProgress: { value: 0 },
              uMotion: { value: 1 },
              uSignal: { value: signalColor },
            }}
            transparent
          />
        </mesh>

        {ringAngles.map((angle, index) => (
          <mesh
            key={angle}
            ref={(node) => {
              rings.current[index] = node;
            }}
            rotation={[angle * 0.22, angle * 0.16, angle]}
          >
            <torusGeometry args={[1.58 + index * 0.16, index === 2 ? 0.035 : 0.018, 10, segments]} />
            <meshStandardMaterial
              color={index === 2 ? "#ff4d00" : index % 2 === 0 ? "#22221f" : "#9ca79f"}
              metalness={0.78}
              roughness={0.3 + index * 0.055}
            />
          </mesh>
        ))}

        <group ref={antennae}>
          {[-1, 1].map((direction) => (
            <group key={direction} rotation={[0, 0, direction * 0.54]}>
              <mesh position={[0, direction * 1.92, 0]}>
                <boxGeometry args={[0.026, 1.18, 0.026]} />
                <meshStandardMaterial color="#242420" metalness={0.86} roughness={0.25} />
              </mesh>
              <mesh position={[0, direction * 2.53, 0]}>
                <sphereGeometry args={[0.075, 16, 16]} />
                <meshBasicMaterial color="#ff4d00" />
              </mesh>
            </group>
          ))}
        </group>
      </group>

      <ParticleDust count={particles} />
      <ScanField />
    </>
  );
}
