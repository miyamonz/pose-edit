import { Suspense } from "react";
import * as THREE from "three";
import { Octahedron, OrbitControls } from "@react-three/drei";
import { AppCanvas } from "../AppCanvas";
import { LoadVRM } from "../LoadVRM";

import { useTurntable } from "./useTurntable";
import { useController, useXR } from "@react-three/xr";
import { useFrame } from "@react-three/fiber";
function App() {
  return (
    <AppCanvas>
      <CanvasContent />
    </AppCanvas>
  );
}
function CanvasContent() {
  const { player } = useXR();
  const leftController = useController("left");
  const rightController = useController("right");

  useFrame(() => {
    if (leftController && rightController) {
      //https://github.com/immersive-web/webxr-gamepads-module/blob/main/gamepads-module-explainer.md#xr-gamepad-mapping
      const [, , lx, ly] = leftController.inputSource.gamepad.axes;
      const [, , rx, ry] = rightController.inputSource.gamepad.axes;

      const scale = 0.05;
      // TODO: playerかcontrollerのtransformに基づいて移動する
      player.position.x += lx * scale;
      player.position.z += ly * scale;

      player.position.y -= ry * scale;
      player.rotation.y -= rx * 0.04;
    }
  });
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
