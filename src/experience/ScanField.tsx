import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceStore } from "../lib/experienceStore";

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  varying vec2 vUv;

  float gridLine(float value, float density, float thickness) {
    float line = abs(fract(value * density - 0.5) - 0.5) / fwidth(value * density);
    return 1.0 - min(line / thickness, 1.0);
  }

  void main() {
    vec2 centered = vUv - 0.5;
    float distanceFromCenter = length(centered);
    float major = max(gridLine(vUv.x, 18.0, 1.0), gridLine(vUv.y, 18.0, 1.0));
    float minor = max(gridLine(vUv.x, 72.0, 0.45), gridLine(vUv.y, 72.0, 0.45));
    float scanPosition = fract(uTime * 0.055 + uProgress * 0.72);
    float scan = 1.0 - smoothstep(0.0, 0.025, abs(vUv.y - scanPosition));
    float vignette = smoothstep(0.7, 0.05, distanceFromCenter);
    float alpha = (major * 0.11 + minor * 0.025 + scan * 0.13) * vignette;
    vec3 graphite = vec3(0.055, 0.055, 0.05);
    vec3 signal = vec3(1.0, 0.302, 0.0);
    vec3 color = mix(graphite, signal, scan * 0.72);
    gl_FragColor = vec4(color, alpha);
  }
`;

export function ScanField() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const motionTime = useRef(0);

  useFrame((_, delta) => {
    if (!material.current || experienceStore.paused) return;
    if (!experienceStore.reducedMotion) motionTime.current += Math.min(delta, 0.05);
    material.current.uniforms.uTime.value = motionTime.current;
    material.current.uniforms.uProgress.value = experienceStore.progress;
  });

  return (
    <mesh position={[0, -2.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[18, 18, 1, 1]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uProgress: { value: 0 },
        }}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
