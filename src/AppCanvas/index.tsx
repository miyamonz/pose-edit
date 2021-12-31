import * as THREE from "three";
import React from "react";
import { Canvas } from "@react-three/fiber";
// import { VRButton } from "three/examples/jsm/webxr/VRButton";

export const AppCanvas: React.VFC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // get global Store and pass value in order to share between another react renderer
  return (
    <Canvas
      dpr={window.devicePixelRatio}
      vr
      onCreated={({ gl, scene }) => {
        scene.background = new THREE.Color("#efefef");
        // const button = VRButton.createButton(gl, null);
        // document.body.appendChild(button);
      }}
    >
      {children}
    </Canvas>
  );
};
