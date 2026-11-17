import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import type { Group, Mesh } from "three";

/** The cobalt from the brief. Kept in one place so it can be changed here. */
const COBALT = "#1559cb";
/** How far the shape leans toward the cursor, in radians. */
const MAX_TILT = 0.25;
/** Spin speed of the shape, in radians per second. */
const SPIN_SPEED = 0.2;

/** Follows the reduced-motion preference and updates when it changes. */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

interface ShapeProps {
  reduced: boolean;
}

function Shape({ reduced }: ShapeProps) {
  const tiltRef = useRef<Group | null>(null);
  const spinRef = useRef<Mesh | null>(null);

  // Initialize the ref
  const reducedRef = useRef(reduced);

  // Update the ref inside an effect, not during render
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  useFrame((state, delta) => {
    const tilt = tiltRef.current;
    const spin = spinRef.current;
    const isReduced = reducedRef.current;

    if (tilt) {
      // The pointer is -1 to 1 across the canvas. Ease toward it, so the lean is smooth.
      const targetX = isReduced ? 0 : -state.pointer.y * MAX_TILT;
      const targetY = isReduced ? 0 : state.pointer.x * MAX_TILT;
      const ease = 1 - Math.exp(-delta * 4);
      tilt.rotation.x += (targetX - tilt.rotation.x) * ease;
      tilt.rotation.y += (targetY - tilt.rotation.y) * ease;
    }

    if (spin && !isReduced) {
      spin.rotation.y += delta * SPIN_SPEED;
    }
  });

  return (
    <Float speed={reduced ? 0 : 1.4} rotationIntensity={0} floatIntensity={reduced ? 0 : 0.6}>
      <group ref={tiltRef}>
        <mesh ref={spinRef}>
          <icosahedronGeometry args={[1.4, 1]} />
          <meshStandardMaterial
            color={COBALT}
            emissive={COBALT}
            emissiveIntensity={0.6}
            roughness={0.4}
            metalness={0.2}
            wireframe
          />
        </mesh>
      </group>
    </Float>
  );
}

/**
  A wireframe icosahedron with cobalt edges, floating on a black background.
  It leans toward the cursor and spins slowly. Reduced motion stops both.
*/
export function ContactGraphic() {
  const reduced = useReducedMotion();

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 4], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      frameloop={reduced ? "demand" : "always"}
    >
      <ambientLight intensity={0.35} />
      <pointLight position={[3, 3, 3]} intensity={1.6} color={COBALT} />
      <pointLight position={[-3, -2, 2]} intensity={0.8} color="#ffffff" />
      <Shape reduced={reduced} />
    </Canvas>
  );
}
