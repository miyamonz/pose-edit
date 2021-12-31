import { Suspense } from "react";
import * as THREE from "three";
import { AppCanvas } from "../AppCanvas";
import { Octahedron, OrbitControls } from "@react-three/drei";

import { useTurntable } from "./useTurntable";
function App() {
  return (
    <AppCanvas>
      <CanvasContent />
    </AppCanvas>
  );
}
function CanvasContent() {
  return (
    <>
      <axesHelper args={[5]} />
      <gridHelper args={[10, 10]} />
      <directionalLight
        args={[0xffffff]}
        position={new THREE.Vector3(1, 1, 1).normalize()}
      />
      <OrbitControls />
      <Suspense fallback={null}>
        <LoadingSpinner />
      </Suspense>
    </>
  );
}

function LoadingSpinner() {
  const ref = useTurntable(0.1);

  return (
    //@ts-ignore
    <Octahedron ref={ref}>
      <meshBasicMaterial attach="material" color="#111" wireframe />
    </Octahedron>
  );
}

export default App;
