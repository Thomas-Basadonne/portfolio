import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../lib/experienceStore";

type ParticleDustProps = {
  count: number;
};

function seeded(index: number, offset: number) {
  const value = Math.sin(index * 127.1 + offset * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

export function ParticleDust({ count }: ParticleDustProps) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const radius = 2.7 + seeded(index, 1) * 4.8;
      const angle = seeded(index, 2) * Math.PI * 2;
      const height = (seeded(index, 3) - 0.5) * 7;
      values[index * 3] = Math.cos(angle) * radius;
      values[index * 3 + 1] = height;
      values[index * 3 + 2] = Math.sin(angle) * radius;
    }
    return values;
  }, [count]);

  useFrame(({ clock }, delta) => {
    if (!points.current || experienceStore.reducedMotion) return;
    points.current.rotation.y += delta * 0.012;
    points.current.rotation.z = Math.sin(clock.elapsedTime * 0.08) * 0.025;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#8e8b82"
        size={0.012}
        transparent
        opacity={0.45}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
