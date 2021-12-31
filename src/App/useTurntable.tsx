import { Mesh } from "three";
import React from "react";
import { useFrame } from "@react-three/fiber";

export function useTurntable(speed: number = 0.01) {
  const ref = React.useRef<Mesh>(null!);
  useFrame(() => {
    ref.current.rotation.y += speed;
  });

  return ref;
}
