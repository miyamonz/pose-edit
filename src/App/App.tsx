import { Suspense } from "react";
import * as THREE from "three";
import { Octahedron, OrbitControls } from "@react-three/drei";
import { AppCanvas } from "../AppCanvas";
import { LoadVRM } from "../LoadVRM";

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
        args={[0xffffff, 0.2]}
        position={new THREE.Vector3(1, 1, 1).normalize()}
      />
      <OrbitControls />
      <Suspense fallback={<LoadingSpinner />}>
        <LoadVRM url="./models/three-vrm-girl.vrm" />
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
